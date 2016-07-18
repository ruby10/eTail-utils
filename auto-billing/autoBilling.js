'use strict'

var async = require('async')
, _ = require('lodash')
, utils = require('ief-utils')
, request = require('request')
, CONSTANTS = require('../constants')

//constructor
function AutoBillingHooks(config) {

}

/**
* @param fieldName is "name" of setting for which json object will be returned
* @param options is options coming from IO
* @param fieldObj is setting object being returned
*/
AutoBillingHooks.prototype.getSettingField = function(fieldName, settings) {
  var fieldObj = null
  , settingSection = _.find(settings.sections, function(section) {
  fieldObj = _.find(section.fields, function(field) {
        // here fieldName is billingRecordType
        if (field.name.search(fieldName) >= 0)  {
          return true
         }
      })
      if (!!fieldObj) {
         return true
      }
    })
   return fieldObj
}

/**
* @param optsObject contains options for request module and json data to be appended to options
* @param hookResponse is the response to be returned form preSavePage hookResponse
* @param callback is the callback function
*/
AutoBillingHooks.prototype.invokeInvoiceFlow = function (optsObject, hookResponse, callback){
  utils.logInSplunk('inside invokeInvoiceFlow| optsObject : ' + JSON.stringify(optsObject) )
  //no need to invoke invoice flow if there is no data
  if(optsObject.optsArray && !optsObject.optsArray.length)
    return callback(null, hookResponse)

  optsObject.opts.json = optsObject.optsArray
  request(optsObject.opts, function(err, response, body) {
    if(err) {
      //TODO write a better way to handle the error here
      utils.logInSplunk('invokeInvoiceFlow | error while triggering Auto-Billing Invoice Flow:' + JSON.stringify(err))
      utils.logInSplunk('invokeInvoiceFlow | statusCode while triggering Auto-Billing Invoice Flow:' + JSON.stringify(err.code))
    }
    callback(null, hookResponse)
  })


}

/**
* @param options is the options coming from IO
* @param cb is the callback function
*/
AutoBillingHooks.prototype.executeAutoBilling= function(options, cb) {
  utils.logInSplunk('invokeAutoBillingFlow | options' +  JSON.stringify(options))
  var optsArray = []
  , optsObject = {}
  , hookResponseData = []
  , hookResponse = {}
  , self = this
  , invoiceAutoBillingExportId = null
  , cashsaleAndInvoiceSettingFieldValue = null
  , cashsaleAndInvoiceSettingField = self.getSettingField('billingRecordType', options.settings)
  , opts = null

  if(!options.settings.commonresources.invoiceAutoBillingExportId){
    return cb(new Error('Could not find invoiceAutoBillingExportId inside commonresources of settings.'))
  }

  invoiceAutoBillingExportId = options.settings.commonresources.invoiceAutoBillingExportId

  opts = {
     uri: CONSTANTS.HERCULES_BASE_URL + '/v1/exports/' + invoiceAutoBillingExportId + '/data'
     , method: 'POST'
     , headers: {
       Authorization: 'Bearer ' + options.bearerToken
       , 'Content-Type': 'application/json'
     }
     , json: []
   }


  if(!cashsaleAndInvoiceSettingField)
    return cb(new Error('Could not find billing record type setting value'))
  else
    cashsaleAndInvoiceSettingFieldValue = cashsaleAndInvoiceSettingField.value

  if(cashsaleAndInvoiceSettingFieldValue === 'Cashsale') {
    _.each(options.data, function(preMapDataJson, index, cb) {
      hookResponseData.push(preMapDataJson[0])
    })
    hookResponse['data'] = hookResponseData
    return cb(null, hookResponse)
  }

  if(cashsaleAndInvoiceSettingFieldValue === 'Invoice') {
    optsObject['optsArray'] = options.data
    optsObject.opts = opts
    // invoking invoice flow
    hookResponse['data'] = hookResponseData
    return self.invokeInvoiceFlow(optsObject, hookResponse, cb)

  }

  if(cashsaleAndInvoiceSettingFieldValue === 'Automatic') {
    _.each(options.data, function(preMapDataJson, index, cb) {
      if(!preMapDataJson[0]['Payment Method']) {
        optsArray.push(preMapDataJson)
    } else {
        hookResponseData.push(preMapDataJson[0])
     }
    })

    //unifying data into optsObject
    optsObject.optsArray = optsArray
    optsObject.opts = opts
    hookResponse['data'] = hookResponseData
    // invoking invoice flow
    return self.invokeInvoiceFlow(optsObject, hookResponse, cb)
    }
}

module.exports = AutoBillingHooks
