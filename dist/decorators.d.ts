import { Context } from "./context";
/**
 * Decorator-based controllers, for people coming from aiogram's class-based
 * routers or from Nest/Spring-style frameworks. These are pure sugar: every
 * decorator just records "when X matches, call this method" into a registry,
 * and `bot.useController(instance)` replays that registry onto the same
 * Composer used by the functional and fluent styles — so all three styles
 * can be mixed in one bot.
 */
type HandlerKind = {
    kind: "command";
    value: string | string[];
} | {
    kind: "hears";
    value: string | RegExp;
} | {
    kind: "action";
    value: string | RegExp;
} | {
    kind: "on";
    value: string;
};
export declare function getControllerHandlers(instance: object): {
    meta: HandlerKind;
    fn: (ctx: Context, next: () => Promise<void>) => unknown;
}[];
/** Class decorator — purely documentational/marker, so ayotbl controllers are easy to spot. Optional. */
export declare function BotController(): ClassDecorator;
export declare function Command(name: string | string[]): MethodDecorator;
export declare function Hears(trigger: string | RegExp): MethodDecorator;
export declare function Action(trigger: string | RegExp): MethodDecorator;
export declare function On(updateType: string): MethodDecorator;
export {};
