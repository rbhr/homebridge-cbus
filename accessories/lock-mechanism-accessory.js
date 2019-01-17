'use strict';

let Service;
let Characteristic;
let CBusAccessory;
let uuid;

const cbusUtils = require('../lib/cbus-utils.js');

const FILE_ID = cbusUtils.extractIdentifierFromFileName(__filename);

module.exports = function (_service, _characteristic, _accessory, _uuid) {
	Service = _service;
	Characteristic = _characteristic;
	CBusAccessory = _accessory;
	uuid = _uuid;

	return CBusLockAccessory;
};

function CBusLockAccessory(platform, accessoryData) {
	//--------------------------------------------------
	// initialize the parent
	CBusAccessory.call(this, platform, accessoryData);

	//--------------------------------------------------
	// register the on-off service
	// Services was gathered at https://github.com/KhaosT/HAP-NodeJS/blob/9eaea6df40811ccc71664a1ab0c13736e759dac7/lib/gen/HomeKitTypes.js#L3180
	this.service = this.addService(new Service.LockMechanism(this.name));

  this.service.getCharacteristic(Characteristic.LockCurrentState)
    .on('get', this.getState.bind(this));

  this.service.getCharacteristic(Characteristic.LockTargetState)
    .on('get', this.getState.bind(this))
		.on('set', this.setState.bind(this));
}

CBusLockAccessory.prototype.getState = function(callback) {
	callback();
	this._log("Getting current state...");
}

CBusLockAccessory.prototype.setState = function(state, callback) {

    var lockState = (state == Characteristic.LockTargetState.SECURED) ? "lock" : "unlock";

    this._log("Set state to %s", lockState);

    var currentState = (state == Characteristic.LockTargetState.SECURED) ?
        Characteristic.LockCurrentState.SECURED : Characteristic.LockCurrentState.UNSECURED;

this.service.setCharacteristic(Characteristic.LockCurrentState, currentState);

callback(null);

CBusLockAccessory.prototype.processClientData = function (err, message) {
	if (!err) {
		console.assert(typeof message.level !== `undefined`, `message.level must not be undefined`);
		const level = message.level;
	}

	}
}
