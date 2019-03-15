'use strict';

let Service;
let Characteristic;
let CBusAccessory;
let uuid;

let cbusUtils = require('../lib/cbus-utils.js');

const ms = require('ms');

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
	// if we have an autoReLockAfter specified, stash it away
	if (typeof accessoryData.autoReLockAfter !== `undefined`) {
		this.autoReLockAfter = ms(accessoryData.autoReLockAfter);
		this._log(FILE_ID, `construct`, `automatically relock after ${this.autoReLockAfter}ms when activated via homebridge`);
	}

	//--------------------------------------------------
	// Time to do some checking
	this.checkState = false;
	this.invert = accessoryData.invert || 'false';


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
	this._log("Getting current state...");
	this.client.receiveLevel(this.netId, message => {
		this.checkState = message.level > 0;
		this._log(FILE_ID, `getOn`, `status = '${this.checkState ? `on` : `off`}'`);
		callback(false, this.checkState ? 1 : 0);
	}, `getState`);
}

		//--------------------------------------------------
		// Guidelines for LockMechanism's Characteristics
		// The value property of LockCurrentState must be one of the following:
		//Characteristic.LockCurrentState.UNSECURED = 0;
		//Characteristic.LockCurrentState.SECURED = 1;
		//Characteristic.LockCurrentState.JAMMED = 2;
		//Characteristic.LockCurrentState.UNKNOWN = 3;
		// The value property of LockTargetState must be one of the following:
		//Characteristic.LockTargetState.UNSECURED = 0;
		//Characteristic.LockTargetState.SECURED = 1;

CBusLockAccessory.prototype.setState = function(lockState, callback, context) {
	let lock = 100;
	let unlock = 0;

	if (context === `event`) {
		// context helps us avoid a never-ending loop
		callback();
	} else {
		console.assert((lockState === 1) || (lockState === 0) || (lockState === true) || (lockState === false));
		const wasLocked = this.checkState;
		this.checkState = (lockState === 1) || (lockState === true);


		if (wasLocked === this.checkState) {
			this._log(FILE_ID, `setState`, `no state change from ${lockState}`);
			callback();
		}

		else if (lockState) {
			if (this.invert === 'true') {
				const invertlock = 100 - lock;
				lock = invertlock;
			}

			this.client.setLevel(this.netId, lock, () => {
				callback();
			});
		} else {
			if (this.invert === 'true') {
				const invertunlock = 100 + unlock;
				unlock = invertunlock;
			}

			this.client.setLevel(this.netId, unlock, () => {
				if (this.autoReLockAfter) {
					this.timeout = setTimeout(() => {
						this._log(FILE_ID, `activity timer expired`, `relocking`);
						this.checkState = true;
						this.client.setLevel(this.netId, lock);
					}, this.autoReLockAfter);
					this._log(FILE_ID, `activity timer activated`, `will relock in ${ms(this.autoReLockAfter)} (${this.autoReLockAfter}ms)`);
				}
				callback();
			});
			}
		}

// if we turn off (regardless of whether by homebridge or cbus), clear out any timeout
if (!lockState && this.timeout) {
	this._log(FILE_ID, `turned off`, `clearing activity timer`);
	clearTimeout(this.timeout);
}
};

CBusLockAccessory.prototype.processClientData = function (err, message) {
	if (!err) {
		console.assert(typeof message.level !== `undefined`, `message.level must not be undefined`);
		const level = message.level;
	}

};
