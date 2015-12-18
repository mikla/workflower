  // Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function getCurrentTabInfo(callback) {
  // Query filter to be passed to chrome.tabs.query - see
  // https://developer.chrome.com/extensions/tabs#method-query
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, function(tabs) {
    // chrome.tabs.query invokes the callback with a list of tabs that match the
    // query. When the popup is opened, there is certainly a window and at least
    // one tab, so we can safely assume that |tabs| is a non-empty array.
    // A window can only have one active tab at a time, so the array consists of
    // exactly one tab.
    var tab = tabs[0];

    // A tab is a plain object that provides information about the tab.
    // See https://developer.chrome.com/extensions/tabs#type-Tab
    var url = tab.url;
    var title = tab.title;

    // tab.url is only available if the "activeTab" permission is declared.
    // If you want to see the URL of other tabs (e.g. after removing active:true
    // from |queryInfo|), then the "tabs" permission is required to see their
    // "url" properties.
    console.assert(typeof url == 'string', 'tab.url should be a string');

    callback(url, title);
  });
}

function sendData(data) {		  

  var XHR = new XMLHttpRequest();
  var urlEncodedData = "";
  var urlEncodedDataPairs = [];
  var name;

  for(name in data) {
    urlEncodedDataPairs.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
  }

  urlEncodedData = urlEncodedDataPairs.join('&').replace(/%20/g, '+');

  XHR.addEventListener('load', function(event) {
    alert('url successfully added', 'success')
  });

  XHR.addEventListener('error', function(event) {
    alert('error occured due add operation', 'error');
  });

  XHR.open('POST', "https://workflowy.com/push_and_poll");

  XHR.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  XHR.setRequestHeader('Content-Length', urlEncodedData.length);

  XHR.send(urlEncodedData);

}

function renderStatus(statusText) {
  document.getElementById('status').textContent = statusText;
}


function generateGuid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
  s4() + '-' + s4() + s4() + s4();
}

function generateClientTimestamp() {
  if (!Date.now) {
    Date.now = function () {
      return new Date().getTime();
    }
  }

  const clientShift = (Date.now() - 1406483506);
  return clientShift.toString();
}

function generateRandomString(len) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < len; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

function prepareRequest(url, title, callback) {	
  chrome.storage.sync.get(function (stored) {
    
    var wfUrl = stored['sharedUrl'];  
    const mostRecentOp = 586657536;
    const shareId = wfUrl.substr(wfUrl.lastIndexOf('/') + 1);

    const newGuid = generateGuid();
    const priority = 0;
    const clientTimestamp = generateClientTimestamp();
    const content = title + ' ' + url;
    const crossCheckUserId = '901887';

    var jsonPacket = [
    {
      "most_recent_operation_transaction_id": mostRecentOp,
      "operations": [
      {
        "type": "create",
        "data": {
          "projectid": newGuid,
          "parentid": "None",
          "priority": priority
        },
        "client_timestamp": clientTimestamp,
        "undo_data": {}
      },
      {
        "type": "edit",
        "data": {
          "projectid": newGuid,
          "name": content
        },
        "client_timestamp": clientTimestamp + 1,
        "undo_data": {
          "previous_last_modified": clientTimestamp,
          "previous_name": ""
        }
      }
      ],
      "share_id": shareId
    }
    ];

    var form = new Object();
    form.client_id = new Date().toISOString();
    form.client_version = '15';
    form.push_poll_id = generateRandomString(8);
    form.push_poll_data = JSON.stringify(jsonPacket);
    form.share_id = shareId;
    form.crosscheck_user_id = crossCheckUserId;
    
    callback(form);  
  });
}

chrome.runtime.onInstalled.addListener(function() {
  // Replace all rules ...
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    // With a new rule ...
    chrome.declarativeContent.onPageChanged.addRules([
    {
        // That fires when a page's URL contains a 'g' ...
        conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { urlMatches: '.*' },
        })
        ],
        // And shows the extension's page action.
        actions: [ new chrome.declarativeContent.ShowPageAction() ]
      }
      ]);
  });
});

chrome.pageAction.onClicked.addListener(function(tab) {
  getCurrentTabInfo(function(url, title) {    
    prepareRequest(url, title, function(data) {
      sendData(data);    
    });          
  });
});