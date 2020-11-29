var Accessory, Service, Characteristic, UUIDGen;
//var debug = false;
var utils = require('./utils.js')
// var moment = require('moment');

var PoolPumpAccessory = function (log, accessory, pumpData, homebridge, platform) {
  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;
  Homebridge = homebridge;

  this.accessory = accessory;
  this.log = log;
  this.accessory.log = log

  var customtypes = require('./customTypes.js')
  var CustomTypes = new customtypes(Homebridge)
  var FakeGatoHistoryService = require('fakegato-history')(homebridge);
  this.loggingService = new FakeGatoHistoryService("energy", this.accessory, { size: 11520, disableTimer: true, storage: 'fs' });


  this.pumpData = pumpData
  this.platform = platform
  this.debug = platform.debug;

  this.service = accessory.getService(Service.Fan);
  if (this.service) {
    this.service
      .getCharacteristic(Characteristic.On)
      .on('get', this.getPumpState.bind(this))
      .on('set', this.setPumpState.bind(this));

    this.service
      .getCharacteristic(Characteristic.RotationSpeed)
      .on('get', this.getPumpSpeed.bind(this))
      .on('set', this.setPumpState.bind(this));

    this.service
      .getCharacteristic(CustomTypes.CurrentPowerConsumption)
      .on('get', this.getPumpWatts.bind(this))

    this.service
      .getCharacteristic(CustomTypes.PumpGPM)
      .on('get', this.getPumpGPM.bind(this))

    this.service
      .getCharacteristic(CustomTypes.PumpRPM)
      .on('get', this.getPumpRPM.bind(this))
  }


  this.updateState(pumpData)

  // not needed/used with latest HomeKit API's
  // accessory.updateReachability(true);
}


PoolPumpAccessory.prototype.getPumpState = function (callback) {
  callback(null, this.pumpData.rpm > 0 ? true : false);
};

PoolPumpAccessory.prototype.setPumpState = function (newValue, callback) {
  if (this.platform.LogLevel >= 4) this.log('Set pump state called, ignoring')
  callback();
};

PoolPumpAccessory.prototype.getPumpSpeed = function (callback) {
  callback(null, this.pumpData.rpm / this.pumpData.type.maxSpeed * 100);
};

PoolPumpAccessory.prototype.setPumpSpeed = function (newValue, callback) {
  // do nothing
  if (this.platform.LogLevel >= 4) this.log('Set pump speed called, ignoring')
  callback();
};

PoolPumpAccessory.prototype.getPumpRPM = function (callback) {
  callback(null, this.pumpData.rpm);
};

PoolPumpAccessory.prototype.getPumpGPM = function (callback) {
  callback(null, this.pumpData.flow);
};

PoolPumpAccessory.prototype.getPumpWatts = function (callback) {
  callback(null, this.pumpData.watts);
};


// For when state is changed elsewhere.
PoolPumpAccessory.prototype.updateState = function (newpumpData) {
  var customtypes = require('./customTypes.js')
  var CustomTypes = new customtypes(Homebridge)

  this.pumpData = newpumpData;
  if (this.platform.LogLevel >= 3)
    this.log('Updating pump to ', this.pumpData.rpm > 0 ? true : false)

  if (this.platform.LogLevel >= 4) {

    this.log('watts ', this.pumpData.watts)
    this.log('RPM % ', this.pumpData.rpm / this.pumpData.type.maxSpeed)
    this.log('Flow ', this.pumpData.flow)
  }

  this.accessory.getService(Service.Fan).getCharacteristic(Characteristic.On)
    .updateValue(this.pumpData.rpm > 0 ? true : false);

  this.accessory.getService(Service.Fan).getCharacteristic(Characteristic.RotationSpeed)
    .updateValue(this.pumpData.rpm / this.pumpData.type.maxSpeed * 100);

  this.accessory.getService(Service.Fan).getCharacteristic(CustomTypes.CurrentPowerConsumption)
    .updateValue(this.pumpData.watts);

  this.accessory.getService(Service.Fan).getCharacteristic(CustomTypes.PumpGPM)
    .updateValue(this.pumpData.flow);

  this.accessory.getService(Service.Fan).getCharacteristic(CustomTypes.PumpRPM)
    .updateValue(this.pumpData.rpm);

  this.loggingService.addEntry({ time: Math.round(new Date().valueOf() / 1000), power: this.pumpData.watts });

  var interval = 5 * 60 * 1000
  clearTimeout(this.pumpUpdateTimer)
  this.pumpUpdateTimer = setInterval(function (platform, loggingService, pumpData) {
    loggingService.addEntry({ time: Math.round(new Date().valueOf() / 1000), power: pumpData.watts })
  }, interval, this.platform, this.loggingService, this.pumpData)

  return
}

module.exports = PoolPumpAccessory;
