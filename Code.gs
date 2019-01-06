/**
 * @OnlyCurrentDoc  Limits the script to only accessing the current spreadsheet.
 */
 
// *** In the oneOffSetting function you need to include you service account file name 
// *** stored on your Google Drive and your Dialogflow Agent project ID 

var SIDEBAR_TITLE = 'INSERT TITLE';

/**
 * One off setup for Dialogflow service account
 */
function oneOffSetting() { 
  var file = DriveApp.getFilesByName('YOUR_SERVICE_ACCOUNT_KEY.json').next(); // <- your key file name
  // used by all using this script
  var propertyStore = PropertiesService.getScriptProperties();
  // service account for our Dialogflow agent
  cGoa.GoaApp.setPackage (propertyStore , 
    cGoa.GoaApp.createServiceAccount (DriveApp , {
      packageName: 'dialogflow_serviceaccount',
      fileId: file.getId(),
      scopes : cGoa.GoaApp.scopesGoogleExpand (['cloud-platform']),
      service:'google_service',
      project_id: 'YOUR_DIALOGFLOW_PROJECT_ID' // <- your Dialogflow Agent Project ID
    }));
}

/**
 * Adds a custom menu with items to show the sidebar and dialog.
 *
 * @param {Object} e The event parameter for a simple onOpen trigger.
 */
function onOpen(e) {
  SpreadsheetApp.getUi() // <- change for Docs, Forms and Slides
      .createAddonMenu()
      .addItem('Start', 'showSidebar')
      .addToUi();
}

/**
 * Runs when the add-on is installed; calls onOpen() to ensure menu creation and
 * any other initializion work is done immediately.
 *
 * @param {Object} e The event parameter for a simple onInstall trigger.
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Opens a sidebar. The sidebar structure is described in the Sidebar.html
 * project file.
 */
function showSidebar() {
  var ui = HtmlService.createTemplateFromFile('Sidebar')
      .evaluate()
      .setTitle(SIDEBAR_TITLE)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showSidebar(ui); // <- change for Docs, Forms and Slides
}

/**
 * Handle text/audio requests from user.
 * @param {String|Audio} from user
 * @param {String} type of request
 * @param {String} lang of request
 * @return {object} JSON-formatted intent response
 */
function handleCommand(input, type, lang){
  var intent = detectMessageIntent(input, type, lang);
  
  // if you are using required parameter uncomment this test to continue the conversation
  /* if (!("allRequiredParamsPresent" in intent.queryResult)){
  return intent;
  } */
  try {
    var param = intent.queryResult.parameters;
    // do stuff with detected parameters
    
    // return intent object client side 
    return intent;
  } catch(e) {
    return intent;
  }
}

/**
 * Detect message intent from Dialogflow Agent.
 * @param {String|Audio} input from user 
 * @param {String} type of input
 * @param {String} lang of request
 * @return {object} JSON-formatted response
 */
function detectMessageIntent(input, type, lang){
  // setting up calls to Dialogflow with Goa
  var goa = cGoa.GoaApp.createGoa ('dialogflow_serviceaccount',
                                   PropertiesService.getScriptProperties()).execute ();
  if (!goa.hasToken()) {
    throw 'something went wrong with goa - no token for calls';
  }
  // set our token 
  Dialogflow.setTokenService(function(){ return goa.getToken(); } );
     
  /* Preparing the Dialogflow.projects.agent.sessions.detectIntent call 
   * https://cloud.google.com/dialogflow-enterprise/docs/reference/rest/v2/projects.agent.sessions/detectIntent
  */
  var requestResource = {
    "queryInput": { },
    "queryParams": {
      "timeZone": Session.getScriptTimeZone() // using script timezone but you may want to handle as a user setting
    }
  };
  
  if (type === 'text'){
    // prepare a text query
    requestResource.queryInput.text = {"text": input,
                                       "languageCode": lang };
  } else if(type === 'audio') {
    // prepare an audio query
    requestResource.queryInput.audioConfig= {"audioEncoding": 'AUDIO_ENCODING_LINEAR_16',
                                             "languageCode": lang };
    requestResource.inputAudio = extractBase64_(input);
  } else {
    throw('Unsupported type');
  }
  // set the porject id
  var PROJECT_ID = goa.getProperty("project_id"); 
  
  // using an URI encoded ActiveUserKey (non identifiable) 
  // https://developers.google.com/apps-script/reference/base/session#getTemporaryActiveUserKey()
  var SESSION_ID = encodeURIComponent(Session.getTemporaryActiveUserKey()); 
  var session = 'projects/'+PROJECT_ID+'/agent/sessions/'+SESSION_ID; // 
  var intent = Dialogflow.projectsAgentSessionsDetectIntent(session, requestResource, {});
  return intent;
}

/**
 * Extract base64 string
 * @param {String} dataURI from client
 * @return {String} baseString
 */
function extractBase64_(dataURI) {
  var baseString;
  if (dataURI.split(',')[0].indexOf('base64') >= 0){
    baseString = dataURI.split(',')[1]
  } else {
    baseString = dataURI;
  }
  return baseString;
}