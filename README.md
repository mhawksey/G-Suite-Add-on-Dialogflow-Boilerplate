# G Suite Add-on Dialogflow Boilerplate
In a [recent episode of Totally Unscripted](https://tu.appsscript.info/previous-episodes/tu19) I demonstrated how you can use the Dialogflow service as a way to allow you to add conversational interfaces to your Google Apps Script projects. Dialogflow is now owned by Google and it already integrates with a number of its existing services like Cloud Speech-to-Text. Dialogflow isn’t limited to voice interactions and is also happy take text input and extract intent and entities from the conversation.

For Totally Unscripted I created two demonstrations, a Google Sheets data highlighter and the ‘Snow Machine’ for Google Slides. I’ve published the Data Highlighter demo as an unlisted add-on which you can [try out from this link](https://chrome.google.com/webstore/detail/data-highlighter/bjpbofkgkgkgclgajnegcfmmdggjdknj?utm_source=permalink) (here is [some test data](https://docs.google.com/spreadsheets/d/1WAvdUaxT_pMMk2-S1vAAe45lJAFRhi4DTAZcSM7aGkM/copy) I used when creating it and the [source code is also on Github](https://github.com/mhawksey/SheetsFormatterBot)). The [code for the ‘Snow Machine’](https://docs.google.com/presentation/d/1gZwzrmWyP_5--vF7q-urQcf7kk-1EJIpmeegNykN4rI/copy) is bound to my Google Slide deck I used in the episode of Totally Unscripted.

![](https://mcdn.hawksey.info/wp-content/uploads/2019/01/ezgif.com-video-to-gif.gif)

Both these examples use the same code pattern for passing either text and audio input to the Dialogflow API to extract intent and entities. With the increasing trend to incorporate conversation interfaces in applications I’ve published a boilerplate for Add-ons to give you a starting point for integrating Dialogflow into your Apps Script project. All the code is in the [G Suite Add-on Dialogflow Boilerplate](https://github.com/mhawksey/G-Suite-Add-on-Dialogflow-Boilerplate) and I’ve also pulled out some highlights in the rest of this post.

## Setting up your Apps Script Project

The steps below are shown in [this highlight clip](https://www.youtube.com/watch?v=cldqx4wXIjs) from the Totally Unscripted episode.

To use the Dialogflow API I’ll be using two client libraries:

*   [cGoa](http://ramblings.mcpher.com/Home/excelquirks/goa) – library developed by Bruce Mcpherson to handle OAuth 2 calls
*   Dialogflow – a library I’ve created for Dialogflow API calls (generated from the Google Discovery Service with the [Generator-SRC](https://github.com/Spencer-Easton/Apps-Script-GoogleApis-Libraries/tree/master/Generator-SRC) script created by Spencer Easton – [read about it](https://plus.google.com/u/0/+SpencerEastonCCS/posts/hrQ9eaHMUW6))

To setup the Dialogflow client library to communicate with your agent you will need to complete the following steps:

1.  Follow the Dialogflow documentation on [Getting the Service Account key](https://dialogflow.com/docs/reference/v2-auth-setup#getting_the_service_account_key) (**Important:** when adding **Roles** to your service account you need to add at least **Dialogflow API Client** to allow interaction with the intent endpoint).
2.  Upload your have downloaded your JSON key file to Google Drive (this will be temporary while we configure the OAuth 2 setup).
3.  The manifest for the boilerplate includes the [required libraries as dependencies](https://github.com/mhawksey/G-Suite-Add-on-Dialogflow-Boilerplate/blob/master/appsscript.json). You can also install these in your script project click on **Resources > Libraries…** and in the ‘Add a library’ field add the following libraries selecting the latest version:
    1.  `MZx5DzNPsYjVyZaR67xXJQai_d-phDA33` – cGoa
    2.  `1G621Wm91ATQwuKtETmIr0H39UeqSXEBofL7m2AXwEkm3UypYmOuWKdCx` – Dialogflow
4.  In your script project modify the `oneOffSetting()` function updating the `NAME_OF_YOUR_JSON_KEY_FILE` with the name of the file uploaded to Drive in step 2 and updating the `YOUR_DIALOGFLOW_PROJECT_ID` (found in the Google Project section of your agent):  
    ![](https://mcdn.hawksey.info/wp-content/uploads/2019/01/image_0.png)![](undefined)
5.  In the Script Editor in the code.gs file **Run > oneOffSetting**

**Important:** As `oneOffSetting()` makes calls to the `DriveApp` service depending on how your code is deployed you might encounter a warning that the app is not verified. To proceed use the Advanced option. **Once `oneOffSetting()` has been run it can be deleted** so that unnecessary scopes aren’t included in your project.

## Communicating with Dialogflow

### Client Side Event Handler

The example code defaults to using the add-on sidebar UI and is based on the editor [Add-ons starters in the G Suite Developer Hub](https://script.google.com/home/start). The code includes a textarea, button for recording audio input and an area where you can provide a summary of the conversation.

![](https://mcdn.hawksey.info/wp-content/uploads/2019/01/null-1.png)

Both the textarea and the record button are bound to the sendCommand function in [SidebarJavaScript.html](https://github.com/mhawksey/G-Suite-Add-on-Dialogflow-Boilerplate/blob/master/SidebarJavaScript.html). The input is either the text entered in the textarea or the audio data. As part of `sendCommand` the code will also send the [`navigator.language`](https://developer.mozilla.org/en-US/docs/Web/API/NavigatorLanguage/language ) which will let you use [Dialogflow’s supported languages](https://dialogflow.com/docs/reference/language) if you wish (read more on [making your Dialogflow agent multilingual](https://dialogflow.com/case-studies)).

### Audio Input

Behind the scenes Dialogflow uses Google’s [Cloud Speech API](https://cloud.google.com/speech-to-text/docs/basics) but you don’t need to worry about making a seperate API call as you can directly provide audio data to the Dialogflow API and let it do the rest of the work. In creating this biolerplate I tested a number of libraries for handling audio input from the client browser. In the end I used a slightly modified version of [Matt Diamond’s RecorderJS](https://github.com/mattdiamond/Recorderjs) which allows the capture of `audio/wav` files (`LINEAR16`).

I looked at the other [supported audio encoding that Dialogflow can use](https://dialogflow.com/docs/reference/api-v2/rest/v2/projects.agent.sessions/detectIntent#audioencoding), but the issue I had with a number of them is they specify a specific sample rate the audio must use. The ability to set the sample rate of audio in the browser ([`audioContextOptions.sampleRate`](https://developer.mozilla.org/en-US/docs/Web/API/AudioContextOptions/sampleRate)) is still not widely implemented.

I also looked at `FLAC` (Free Lossless Audio Codec) as it is the recommended encoding because it is lossless and requires only about half the bandwidth of `LINEAR16`. I found this [JavaScript FLAC encoder](https://github.com/mmig/speech-to-flac) which was designed to be used with the Cloud Speech API, unfortunately my various attempts to port this to Apps Script failed.

### Server Side Detecting and Handling Intent

Within `Code.gs` there are two main functions for detecting and handling intent. The client side `sendCommand` function calls `handleCommand` in `Code.gs`. This function passes any input to `detectMessageIntent` which formats and makes the call to the Dialogflow API. Within `handleCommand` you can add additional code to handle the returned intent object:

```
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
```

The `detectMessageIntent` function provides a wrapper for calls to the Dialogflow [`detectIntent`](https://cloud.google.com/dialogflow-enterprise/docs/reference/rest/v2/projects.agent.sessions/detectIntent) API endpoint. As part of this it uses Goa to get/refresh the access token and prepares either the text or audio `queryInput` parameters. As part of this function a timezone is provided from the script properties, which you might want to override particularly if you are extracting time and date intents. The function also uses Apps Scripts built in `Session.getTemporaryActiveUserKey()` for the `Session ID`. This can be useful for continuing conversations if not all required parameters are detected by Dialogflow, however, worth testing to make sure the user doesn’t end up in any circular conversations.

## Summary

Hopefully you will find this biolerplate for Dialogflow useful. Feel free to open an issue or suggest improvements in [the Github repo](https://github.com/mhawksey/G-Suite-Add-on-Dialogflow-Boilerplate).
