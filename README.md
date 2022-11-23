# MrCool Homebridge Plugin

[![license](https://badgen.net/github/license/isaac-webb/homebridge-mrcool)](https://github.com/isaac-webb/homebridge-mrcool/blob/master/LICENSE)
[![npm](https://badgen.net/npm/v/homebridge-mrcool)](https://www.npmjs.com/package/homebridge-mrcool)
[![npm](https://badgen.net/npm/dt/homebridge-mrcool)](https://www.npmjs.com/package/homebridge-mrcool)

This plugin allows HomeKit to control MrCool mini splits using the [`node-mrcool`](https://github.com/isaac-webb/node-mrcool) package. 

## Acknowledgements

Like [`node-mrcool`](https://github.com/isaac-webb/node-mrcool), the vast majority of this code is either copied straight from or largely
based on [Nicholas Robinson's](https://github.com/nicholasrobinson)
[`homebridge-smartcielo`](https://github.com/nicholasrobinson/homebridge-smartcielo). I made the changes necessary to make this plugin work
with my rewritten version of the API package.

## Usage

To configure the package, use the Homebridge UI. You will need your username, password, and your public IP (I suspect this doesn't actually
have to be your public IP, but the API uses it as a session identifier). Then, add the MAC address of each MrCool unit you would like to
control.

## Contributing

This package is a work in progress. Documentation is definitely lacking, and there are a few improvements that can be made (remove silly
MAC address formatting restriction). Feel free to reach out with questions, comments, or recommendations.

Best,

-Isaac Webb
