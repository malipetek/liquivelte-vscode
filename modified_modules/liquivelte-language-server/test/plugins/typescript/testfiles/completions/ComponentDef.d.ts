/// <reference lib="dom" />
import { SvelteComponentTyped } from 'svelte';
export declare class ComponentDef extends SvelteComponentTyped<{}, {
    event1: CustomEvent<null>;
    /**
     * documentation for event2
     */
    event2: CustomEvent<string>;
}, {
    default: {
        let1: boolean;
        /**
         * documentation for let2
         */
        let2: string;
    };
}> {
}
export declare class ComponentDef2 extends SvelteComponentTyped<{}, {
    event1: CustomEvent<number>;
} | {
    event1: CustomEvent<string>;
}, {}> {
}
