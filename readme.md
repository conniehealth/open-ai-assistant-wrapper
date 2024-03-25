# OpenAI Assistant Wrapper

## Installation
`npm install @conniehealth/open-ai-assistant`

## Usage
```
import { OpenAiAssistant } from '@conniehealth/open-ai-assistant';

const apiKey = 'Your OpenAI API key';
const assistantId = 'Your Assistant ID'; // Create the assistant through the OpenAI assistant UI
const assistant = new OpenAiAssistant(apiKey, assistantId);

const exampleFn = ({zip}) => { return '04103' };
assistant.registerAction('getCountyCode', exampleFn);

const thread = await assistant.createThread();
const messages = await assistant.sendMessageToThread(thread.id, "What is the county code for ZIP code 85001?")
console.log(JSON.stringify(messages));
```
