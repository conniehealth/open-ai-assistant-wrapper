# OpenAI Assistant Wrapper

## Installation
`npm install @conniehealth/open-ai-thread-manager`

## Usage
```
import { OpenAiThreadManager } from '@conniehealth/open-ai-thread-manager';

const apiKey = 'Your OpenAI API key';
const assistantId = 'Your Assistant ID'; // Create the assistant through the OpenAI assistant UI
const threadManager = new OpenAiThreadManager(apiKey, assistantId);

const exampleFn = ({zip}) => { return '04103' };
threadManager.registerAction('getCountyCode', exampleFn);

const thread = await threadManager.createThread();
const messages = await threadManager.sendMessageToThread(thread.id, "What is the county code for ZIP code 85001?")
console.log(JSON.stringify(messages));
```
