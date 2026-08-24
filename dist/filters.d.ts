import { Context } from "./context";
import { Predicate } from "./composer";
export declare function mention(): Predicate<Context>;
export declare function hashtag(): Predicate<Context>;
export declare function cashtag(): Predicate<Context>;
export declare function url(): Predicate<Context>;
export declare function textLink(): Predicate<Context>;
export declare function textMention(): Predicate<Context>;
export declare function phone(): Predicate<Context>;
export declare function email(): Predicate<Context>;
export declare function botCommand(): Predicate<Context>;
export declare function spoiler(): Predicate<Context>;
export declare function customEmoji(): Predicate<Context>;
/**
 * Matches message_reaction updates — optionally only a specific emoji being
 * added. `reaction()` alone matches any reaction change; `reaction('👍')`
 * matches only when 👍 appears in the new reaction set.
 */
export declare function reaction(emoji?: string): Predicate<Context>;
