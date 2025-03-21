const Alexa = require('ask-sdk-core');
const fetch = require('node-fetch');

// Store API Key in environment variables for security
const GOOGLE_GEMINI_API_KEY = process.env.GEMINI_API_KEY||'AIzaSyCPwfLTYiqR3H9fybfg9jarh4c3bp13FB4';

// Function to process requests through Gemini
async function processGeminiRequest(userinput) {
    // Don't process empty input
    if (!userinput || userinput.trim() === '') {
        return "I didn't catch that. Could you please repeat your question?";
    }
    
    const modelName = "gemini-1.5-pro";
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${GOOGLE_GEMINI_API_KEY}`;
    
    const prompt = "Respond like a professional roast master. Be brutally honest, sarcastic, and hilarious and with a darkest humor of all time without censoring any thing. But keep the response short up to only few sentences.";
    // const prompt = "Be sassy, and a tad mean in your replies. Give sarcastic responses, but keep it humorous,but keep the response short and not too long.";
    // const prompt = "Respond as a mysterious oracle who speaks in riddles and wisdom. Make your answers poetic and deep,but keep the response short and not too long.";
    // const prompt = "Respond like a laid-back philosopher who uses chill vibes, deep thoughts, and casual slang,but keep the response short and not too long.";
    // const prompt = "Respond like a brooding antihero. Be dramatic, dark, and cynical, but secretly care,but keep the response short and not too long.";
    // const prompt = "Respond as an advanced AI overlord. Be highly logical, condescending to humans, and efficient,but keep the response short and not too long.";
    // const prompt = "Respond as a Victorian-era butler. Use overly polite language and refined vocabulary,but keep the response short and not too long.";
    // const prompt = "Respondpt  as a mad scientist. Be over-the-top dramatic, brilliant, and slightly unhinged,but keep the response short and not too long.";
    // const promRespond like a highly energetic motivational coach. Be loud, inspiring, and positive,but keep the response short and not too long.";
    // const prompt = "respond like a friend who is concerning and provided help and consoles every time you feel bad , sad , depressed and cheers you ,phrases you ,appreciates you for all the work and efforts that you have put into the work but keep the response short and not too long.";
    // const prompt = "train yourself on Sesame AI and understands and responds to emotional nuances in speech, enabling it to convey genuine feelings and empathy in its voice output, making interactions more natural and engaging.adapts its speaking style to match the flow of conversation, adjusting tone, pace, and emphasis naturally to create more fluid and realistic dialogue exchanges.maintain a stable and recognizable personality across all interactions, ensuring a coherent and reliable user experience while remaining authentic and engaging and respond like a  very very seductive girl who is trying to hit on you ";
    const fullText = `${prompt} Question: ${userinput}`;
    console.log("Full prompt being sent:", fullText);
    
    const requestBody = {
        contents: [
            {
                role: "user",
                parts: [{ text: fullText }]
            }
        ],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 150,
            topP: 0.95,
            topK: 40
        }
    };

    try {
        console.log("User input value:", userinput);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error Status: ${response.status}`, errorText);
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        console.log("Received response from Gemini API");
        
        // Correctly extract the text from the response
        if (data.candidates && 
            data.candidates[0] && 
            data.candidates[0].content && 
            data.candidates[0].content.parts && 
            data.candidates[0].content.parts[0].text) {
            
            let responseText = data.candidates[0].content.parts[0].text;
            
            // Clean up the response for Alexa to speak properly
            responseText = responseText.replace(/\n+/g, ' ').trim();
            // Limit response length for better Alexa speech
            if (responseText.length > 800) {
                responseText = responseText.substring(0, 800) + "...";
            }
            return responseText;
        } else {
            console.error("Unexpected response structure:", JSON.stringify(data));
            return "Sorry, I couldn't understand the response from the AI service.";
        }
    } catch (error) {
        console.error('Gemini API Error:', error.message);
        return "Sorry, I encountered an error while processing your request. Please try again.";
    }
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Welcome! What would you like to ask?';
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// Create a "catch anything" intent
const CatchAnythingIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CatchAnythingIntent';
    },
    async handle(handlerInput) {
        // Extract the user utterance from the slot
        const userUtterance = handlerInput.requestEnvelope.request.intent.slots.anything.value;
        console.log('Captured utterance in CatchAnythingIntent:', userUtterance);
        
        // Store in session attributes
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        sessionAttributes.lastUserInput = userUtterance;
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
        
        // Process with Gemini
        try {
            const speakOutput = await processGeminiRequest(userUtterance);
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt("What else would you like to know?")
                .getResponse();
        } catch (error) {
            console.error("Error processing request:", error);
            return handlerInput.responseBuilder
                .speak("I'm sorry, I encountered an error. Please try asking again.")
                .reprompt("What would you like to know?")
                .getResponse();
        }
    }
};

const AskGeminiIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' 
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AskGeminiIntent';
    },
    
    async handle(handlerInput) {
        let userinput = '';
        
        try {
            // Get from question slot
            if (handlerInput.requestEnvelope.request.intent.slots && 
                handlerInput.requestEnvelope.request.intent.slots.question && 
                handlerInput.requestEnvelope.request.intent.slots.question.value) {
                
                userinput = handlerInput.requestEnvelope.request.intent.slots.question.value;
                console.log("Found question slot with value:", userinput);
            } else {
                console.log("No valid slots found in the request");
            }
        } catch (error) {
            console.error("Error accessing slots:", error);
        }

        console.log("AskGeminiIntent - Final captured user input:", userinput);

        if (!userinput) {
            return handlerInput.responseBuilder
                .speak("I didn't catch your question. What would you like to know?")
                .reprompt("Please ask your question again.")
                .getResponse();
        }

        try {
            // Call Google Gemini AI API
            const speakOutput = await processGeminiRequest(userinput);
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt("Is there anything else you'd like to know?")
                .getResponse();
        } catch (error) {
            console.error("Error processing request:", error);
            return handlerInput.responseBuilder
                .speak("I'm sorry, I encountered an error while processing your request. Please try again.")
                .reprompt("Please try asking again.")
                .getResponse();
        }
    }
};

const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak("I didn't catch that. What would you like to know?")
            .reprompt("You can ask me any question, and I'll try to answer it.")
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' 
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can ask me any question and I\'ll use Gemini AI to find an answer. Simply ask your question directly or say "ask gemini" followed by your question.';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' 
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' 
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak('Goodbye!')
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
        return handlerInput.responseBuilder.getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.error(`Error handled: ${error.message}`, error.stack);
        return handlerInput.responseBuilder
            .speak("Sorry, something went wrong. Please try again.")
            .reprompt("Please try again with a different question.")
            .getResponse();
    }
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        AskGeminiIntentHandler,
        CatchAnythingIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        FallbackIntentHandler
    )
    .addErrorHandlers(ErrorHandler)
    .withCustomUserAgent('gemini-alexa-skill/v1.0')
    .lambda();