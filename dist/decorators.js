"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getControllerHandlers = getControllerHandlers;
exports.BotController = BotController;
exports.Command = Command;
exports.Hears = Hears;
exports.Action = Action;
exports.On = On;
const registry = new WeakMap();
function register(target, methodName, meta) {
    const ctor = target.constructor;
    const list = registry.get(ctor) ?? [];
    list.push({ ...meta, methodName });
    registry.set(ctor, list);
}
function getControllerHandlers(instance) {
    const list = registry.get(instance.constructor) ?? [];
    return list.map((h) => ({
        meta: h,
        fn: (ctx, next) => instance[h.methodName](ctx, next),
    }));
}
/** Class decorator — purely documentational/marker, so ayotbl controllers are easy to spot. Optional. */
function BotController() {
    return (target) => target;
}
function Command(name) {
    return (target, propertyKey) => register(target, propertyKey, { kind: "command", value: name });
}
function Hears(trigger) {
    return (target, propertyKey) => register(target, propertyKey, { kind: "hears", value: trigger });
}
function Action(trigger) {
    return (target, propertyKey) => register(target, propertyKey, { kind: "action", value: trigger });
}
function On(updateType) {
    return (target, propertyKey) => register(target, propertyKey, { kind: "on", value: updateType });
}
//# sourceMappingURL=decorators.js.map