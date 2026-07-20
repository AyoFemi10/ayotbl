import { Context } from "./context";

/**
 * Decorator-based controllers, for people coming from aiogram's class-based
 * routers or from Nest/Spring-style frameworks. These are pure sugar: every
 * decorator just records "when X matches, call this method" into a registry,
 * and `bot.useController(instance)` replays that registry onto the same
 * Composer used by the functional and fluent styles — so all three styles
 * can be mixed in one bot.
 */

type HandlerKind =
  | { kind: "command"; value: string | string[] }
  | { kind: "hears"; value: string | RegExp }
  | { kind: "action"; value: string | RegExp }
  | { kind: "on"; value: string };

type HandlerMeta = HandlerKind & { methodName: string | symbol };

const registry = new WeakMap<Function, HandlerMeta[]>();

function register(target: object, methodName: string | symbol, meta: HandlerKind) {
  const ctor = target.constructor;
  const list = registry.get(ctor) ?? [];
  list.push({ ...meta, methodName });
  registry.set(ctor, list);
}

export function getControllerHandlers(instance: object): { meta: HandlerKind; fn: (ctx: Context, next: () => Promise<void>) => unknown }[] {
  const list = registry.get(instance.constructor) ?? [];
  return list.map((h) => ({
    meta: h,
    fn: (ctx: Context, next: () => Promise<void>) => (instance as any)[h.methodName](ctx, next),
  }));
}

/** Class decorator — purely documentational/marker, so ayotbl controllers are easy to spot. Optional. */
export function BotController(): ClassDecorator {
  return (target) => target;
}

export function Command(name: string | string[]): MethodDecorator {
  return (target, propertyKey) => register(target as object, propertyKey, { kind: "command", value: name });
}

export function Hears(trigger: string | RegExp): MethodDecorator {
  return (target, propertyKey) => register(target as object, propertyKey, { kind: "hears", value: trigger });
}

export function Action(trigger: string | RegExp): MethodDecorator {
  return (target, propertyKey) => register(target as object, propertyKey, { kind: "action", value: trigger });
}

export function On(updateType: string): MethodDecorator {
  return (target, propertyKey) => register(target as object, propertyKey, { kind: "on", value: updateType });
}
