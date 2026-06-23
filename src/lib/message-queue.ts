import { Channel } from "stream-chat";

export type QueueMessageStatus = "PENDING" | "SENDING" | "FAILED" | "SENT";

export interface QueueMessage {
  id: string; // Temp ID
  channelId: string;
  text: string;
  attachments?: any[];
  status: QueueMessageStatus;
  createdAt: Date;
  senderId: string;
  quotedMessageId?: string;
}

class OutgoingMessageQueueManager {
  private queue: QueueMessage[] = [];
  private listeners: Set<(queue: QueueMessage[]) => void> = new Set();

  public getMessages(channelId: string): QueueMessage[] {
    return this.queue.filter((m) => m.channelId === channelId);
  }

  public subscribe(listener: (queue: QueueMessage[]) => void): () => void {
    this.listeners.add(listener);
    // Initial call
    listener([...this.queue]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l([...this.queue]));
  }

  public async addMessage(
    channel: Channel,
    text: string,
    senderId: string,
    attachments: any[] = [],
    quotedMessageId?: string
  ): Promise<void> {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const newItem: QueueMessage = {
      id: tempId,
      channelId: channel.id!,
      text,
      attachments,
      status: "PENDING",
      createdAt: new Date(),
      senderId,
      quotedMessageId,
    };

    this.queue.push(newItem);
    this.notify();

    // Trigger process in background
    this.processMessage(channel, tempId);
  }

  private async processMessage(channel: Channel, tempId: string) {
    const idx = this.queue.findIndex((m) => m.id === tempId);
    if (idx === -1) return;

    this.queue[idx].status = "SENDING";
    this.notify();

    try {
      await channel.sendMessage({
        text: this.queue[idx].text,
        attachments: this.queue[idx].attachments,
        quoted_message_id: this.queue[idx].quotedMessageId,
      });

      // Remove from queue once successfully sent to Stream.
      // The WebSocket event message.new will insert the permanent message.
      this.queue = this.queue.filter((m) => m.id !== tempId);
      this.notify();
    } catch (e) {
      console.error("Queue process message failed:", e);
      const failIdx = this.queue.findIndex((m) => m.id === tempId);
      if (failIdx !== -1) {
        this.queue[failIdx].status = "FAILED";
        this.notify();
      }
    }
  }

  public async retryMessage(channel: Channel, tempId: string) {
    const item = this.queue.find((m) => m.id === tempId);
    if (!item) return;
    this.processMessage(channel, tempId);
  }

  public removeMessage(tempId: string) {
    this.queue = this.queue.filter((m) => m.id !== tempId);
    this.notify();
  }
}

export const outgoingMessageQueue = new OutgoingMessageQueueManager();
