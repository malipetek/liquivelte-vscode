<script>
    // based on suggestions from:
    // Inclusive Components by Heydon Pickering https://inclusive-components.design/toggle-button/
    // On Designing and Building Toggle Switches by Sara Soueidan https://www.sarasoueidan.com/blog/toggle-switch-design/
    // and this example by Scott O'hara https://codepen.io/scottohara/pen/zLZwNv

    export let label;
    export let value = true;

    const uniqueID = Math.floor(Math.random() * 100);

    function handleClick(event) {
        value = !value;
    }

    const slugify = (str = "") =>
        str.toLowerCase().replace(/ /g, "-").replace(/\./g, "");
</script>

<div class="s s--inner">
    <span id={`switch-${uniqueID}`}>{label}</span>
    <div
        class="button"
        class:ison={value}
        role="switch"
        aria-labelledby={`switch-${uniqueID}`}
        on:click={handleClick}
    >
        <span class="mr"><slot name="on" /></span>
        <span class="ml"><slot name="off" /></span>
    </div>
</div>
<style>
    :root {
        --accent-color: var(--vscode-button-background);
        --gray: #ccc;
    }
    * {
        user-select: none;
    }
    /* Inner Design Option */
    .s--inner .button {
        background-color: unset !important;
        padding: 0.5em;
        border: 1px solid rgba(125, 125, 125, 0.2);
        display: flex;
        justify-content: center;
        cursor: pointer;
        margin-top: 1em;
    }
    [role="switch"].ison :first-child,
    [role="switch"]:not(.ison) :last-child {
        display: none;
        color: #fff;
    }

    .s--inner .button span {
        user-select: none;
        pointer-events: none;
        padding: 0.25em;
    }

    .s--inner .button span.mr {
        margin-right: 0.5em;
    }

    .s--inner .button span.ml {
        margin-left: 0.5em;
    }

    .s--inner .button:focus {
        outline: var(--accent-color) solid 1px;
    }

    /* Inner Design Option */
    [role="switch"].ison :first-child,
    [role="switch"]:not(.ison) :last-child {
        border-radius: 0.25em;
        background: var(--accent-color);
        display: inline-block;
    }

    .s--inner .button:focus {
        box-shadow: 0 0px 8px var(--accent-color);
        border-radius: 0.1em;
    }
</style>
