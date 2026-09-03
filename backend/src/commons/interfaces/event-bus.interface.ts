export interface DomainEvent<T = unknown> {
  name: string;
  payload: T;
  companyId: string;
  occurredAt: Date;
}

export interface EventBusPort {
  publish<T>(event: DomainEvent<T>): Promise<void>;
  subscribe<T>(eventName: string, handler: (event: DomainEvent<T>) => Promise<void>): void;
}

export const EVENT_BUS = Symbol('EVENT_BUS');
