import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { MrCoolHomebridgePlatform } from './platform';
import { MrCoolHVAC } from 'node-mrcool';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class MrCoolPlatformAccessory {
  private service: Service;
  private temperatureDisplayUnits = 1;

  constructor(
    private readonly platform: MrCoolHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly hvac: MrCoolHVAC,
  ) {

    // Set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'MrCool')
      .setCharacteristic(this.platform.Characteristic.Model, 'BREEZ-I')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.hvac.getMacAddress());

    // Establish a Thermostat service
    this.service = this.accessory.getService(this.platform.Service.Thermostat)
      || this.accessory.addService(this.platform.Service.Thermostat);

    // Set the service name, this is what is displayed as the default name on the Home app
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.hvac.getDeviceName());

    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
      .onGet(this.getCurrentHeatingCoolingState.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .onGet(this.getTargetHeatingCoolingState.bind(this))
      .onSet(this.setTargetHeatingCoolingState.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getCurrentTemperature.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .onGet(this.getTargetTemperature.bind(this))
      .onSet(this.setTargetTemperature.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
      .onGet(this.getTemperatureDisplayUnits.bind(this))
      .onSet(this.setTemperatureDisplayUnits.bind(this));
  }

  async getCurrentHeatingCoolingState(): Promise<CharacteristicValue> {
    const mode = this.getModeHelper(this.hvac.getPower(), this.hvac.getMode());
    this.platform.log.debug('getCurrentHeatingCoolingState', mode);
    const state = this.convertModeToHeatingCoolingState(mode);
    return state;
  }

  async getTargetHeatingCoolingState(): Promise<CharacteristicValue> {
    const mode = this.getModeHelper(this.hvac.getPower(), this.hvac.getMode());
    this.platform.log.debug('getTargetHeatingCoolingState', mode);
    return this.convertModeToHeatingCoolingState(mode);
  }

  async getCurrentTemperature(): Promise<CharacteristicValue> {
    const temperature = this.hvac.getRoomTemperature();
    this.platform.log.debug('getCurrentTemperature', temperature);
    return this.convertFahrenheitToCelsius(temperature);
  }

  async getTargetTemperature(): Promise<CharacteristicValue> {
    const temperature = this.hvac.getTemperature();
    this.platform.log.debug('getTargetTemperature', temperature);
    return this.convertFahrenheitToCelsius(temperature);
  }

  async getTemperatureDisplayUnits(): Promise<CharacteristicValue> {
    this.platform.log.debug('getTemperatureDisplayUnits', this.temperatureDisplayUnits);
    return this.temperatureDisplayUnits;
  }

  async setTargetHeatingCoolingState(state: CharacteristicValue) {
    const mode = this.convertHeatingCoolingStateToMode(state);
    this.platform.log.debug('setTargetHeatingCoolingState', mode);
    if (mode === 'off') {
      if (this.hvac.getPower() === 'off') {
        this.platform.log.debug('Skipping Command');
      } else {
        this.platform.log.info('Sending power off');
        await this.hvac.powerOff(this.platform.hvacAPI);
      }
    } else {
      if (this.hvac.getPower() === 'on' && this.hvac.getMode() === mode) {
        this.platform.log.debug('Skipping Command');
      } else {
        if (this.hvac.getPower() === 'off') {
          this.platform.log.info('Sending power on');
          await this.hvac.powerOn(this.platform.hvacAPI);
          this.platform.log.debug('Sent Command', 'sendPowerOn');
          // TODO: Investigate closing the loop and removing hard-coded delay.
          // Note: Potentially there is a way to poll the power until it is updated before sending mode.
          setTimeout(async () => {
            this.platform.log.info('Setting mode to ' + mode);
            await this.hvac.setMode(mode, this.platform.hvacAPI);
          }, 10000);
        } else {
          this.platform.log.info('Setting mode to ' + mode);
          await this.hvac.setMode(mode, this.platform.hvacAPI);
        }
      }
    }
  }

  async setTargetTemperature(temperature: CharacteristicValue) {
    const temperatureInFahrenheit = this.convertCelsiusToFahrenheit(temperature, 62, 86);
    this.platform.log.debug('setTargetTemperature', temperatureInFahrenheit);
    if (this.hvac.getTemperature() === temperature) {
      this.platform.log.debug('Skipping Command');
    } else {
      this.platform.log.info('Setting temperature to ' + temperatureInFahrenheit + ' °F / '
        + this.convertFahrenheitToCelsius(temperatureInFahrenheit) + ' °C');
      await this.hvac.setTemperature(temperatureInFahrenheit, this.platform.hvacAPI);
    }
  }

  async setTemperatureDisplayUnits(displayUnits: CharacteristicValue) {
    this.platform.log.debug('setTemperatureDisplayUnits', displayUnits);
    this.platform.log.info('Setting temperature display units to ' + (displayUnits ? '°F' : '°C'));
    this.temperatureDisplayUnits = displayUnits as number;
  }

  private getModeHelper(power, mode) {
    return power === 'off' ? 'off' : mode;
  }

  private convertCelsiusToFahrenheit(temperature, minTemperature, maxTemperature) {
    return Math.min(Math.max(Math.round(temperature * 9 / 5 + 32), minTemperature), maxTemperature);
  }

  private convertFahrenheitToCelsius(temperature) {
    return Math.round((temperature - 32) * 5 / 9 * 10)/10;
  }

  private convertHeatingCoolingStateToMode(state) {
    switch (state) {
      case 1:
        return 'heat';
      case 2:
        return 'cool';
      case 3:
        return 'auto';
      case 0:
      default:
        return 'off';
    }
  }

  private convertModeToHeatingCoolingState(mode) {
    switch (mode) {
      case 'heat':
        return 1;
      case 'cool':
        return 2;
      case 'auto':
        return 3;
      case 'off':
      default:
        return 0;
    }
  }
}
