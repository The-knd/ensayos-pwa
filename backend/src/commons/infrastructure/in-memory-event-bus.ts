import { Injectable } from '@nestjs/common';
import { EventBusPort, DomainEvent } from '../interfaces/event-bus.interface';

@Injectable()
export class InMemoryEventBus implements EventBusPort {
  private handlers: Map<string, Array<(event: DomainEvent) => Promise<void>>> = new Map();

  async publish<T>(event: DomainEvent<T>): Promise<void> {
    const eventHandlers = this.handlers.get(event.name) || [];
    for (const handler of eventHandlers) {
      await handler(event);
    }
  }

  subscribe<T>(eventName: string, handler: (event: DomainEvent<T>) => Promise<void>): void {
    const existing = this.handlers.get(eventName) || [];
    existing.push(handler as (event: DomainEvent) => Promise<void>);
    this.handlers.set(eventName, existing);
  }
}
