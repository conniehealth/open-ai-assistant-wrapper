import { OpenAI } from 'openai'
import { MessageContent } from 'openai/resources/beta/threads/messages/messages';

export type OpenAiAction = (arg: Record<string, any>) => string | Promise<string>
export type OpenAiActionMap = { [k: string]: OpenAiAction }

export class OpenAiAssistant {
  private openai: OpenAI;
  private assistantId: string;
  private actions: OpenAiActionMap;

  constructor(apiConnection: string | OpenAI, assistantId: string, actions: OpenAiActionMap) {
    this.actions = actions ?? {};
    this.assistantId = assistantId;
    if (typeof apiConnection === 'string') {
      this.openai = new OpenAI({ apiKey: apiConnection });
    } else {
      this.openai = apiConnection;
    }
  }

  getClient() {
    return this.openai;
  }

  registerAction(actionName: string, action: OpenAiAction, force = false) {
    if (!actionName || !action || (!force && this.actions[actionName])) return false;

    this.actions[actionName] = action;
    return true;
  }

  async createThread() {
    return this.openai.beta.threads.create();
  }

  async sendMessageToThread(
    threadId: string,
    content: string,
    assistantId = this.assistantId
  ) {
    const message = await this.openai.beta.threads.messages.create(
      threadId,
      { role: 'user', content },
    );

    const { id: runId } = await this.openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
    });

    await this.processThreadRun(threadId, runId);
    return this.getMessages(threadId, message.id, 'text');
  }

  async getMessages(
    threadId: string,
    afterId: string | null = null,
    messageType: 'image_file' | 'text' | null = null
  ) {
    const messages: Array<MessageContent> = [];

    const addMessages = (page: OpenAI.Beta.Threads.Messages.MessagesPage) => {
      page.data.forEach((messageData) => {
        messageData.content.forEach((messageContent) => {
          if (messageType &&  messageType === messageContent.type) {
            messages.push(messageContent);
          }
        });
      });
    };

    const messageListOptions: OpenAI.Beta.Threads.Messages.MessageListParams = {
      order: 'asc',
    };
    if (afterId) messageListOptions.after = afterId;
    let messagesPage = await this.openai.beta.threads.messages.list(threadId, messageListOptions);

    while(messagesPage.hasNextPage()) {
      addMessages(messagesPage);
      messagesPage = await messagesPage.getNextPage();
    }
    addMessages(messagesPage); // add messages from the last page

    return messages;
  }

  processThreadRun(threadId: string, runId: string, actions: OpenAiActionMap = this.actions, checkMs = 100): Promise<any> {
    let isSubmittingTools = false;

    const waitFor = (waitMs: number) => {
      return new Promise(resolve => setTimeout(resolve, waitMs));
    };

    const checkThreadRun = async (): Promise<any> => {
      const { status, required_action } = await this.openai.beta.threads.runs.retrieve(
        threadId,
        runId,
      );

      if (status === 'completed') return;

      if (
        status === 'requires_action' &&
        required_action?.type === 'submit_tool_outputs' &&
        !isSubmittingTools
      ) {
        isSubmittingTools = true;

        const toolOutputs: OpenAI.Beta.Threads.Runs.RunSubmitToolOutputsParams.ToolOutput[] = [];
        for (const toolCall of required_action.submit_tool_outputs.tool_calls) {
          const actionName = toolCall.function.name;
          if (!actionName) return;

          const action = actions[actionName];
          if (!action) return;

          const args = JSON.parse(toolCall.function.arguments);
          const result = await action(args);
          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: result,
          });
        }

        if (toolOutputs.length) {
          await this.openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
            tool_outputs: toolOutputs,
          });
        }
      }

      await waitFor(checkMs);
      return checkThreadRun();
    };

    return checkThreadRun();
  }
}
