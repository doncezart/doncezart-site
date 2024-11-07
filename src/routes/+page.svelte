<!-- @migration-task Error while migrating Svelte code: Event attribute must be a JavaScript expression, not a string -->
<div class="landing">
    <img src="logo-long.svg" alt="DONCEZART Logo" class="logo-long"/>
    <img src="logo-square.svg" alt="DONCEZART Logo" class="logo-square"/>
    <p>The swiss army knife of the creative world</p>
</div>

<h1>Artworks</h1>
<div class="case-studies">
    <div class="case-study">
        <img src="https://cdn.doncez.art/previews/case-study-001.webp" alt="Case Study" style="width: 100%"/>
        <h3>DONCEZART</h3>
    </div>
    <div class="case-study">
        <img src="https://cdn.doncez.art/previews/case-study-002.webp" alt="Case Study" style="width: 100%"/>
        <h3>PIM</h3>
    </div>
    <div class="case-study">
        <img src="https://cdn.doncez.art/previews/case-study-003.webp" alt="Case Study" style="width: 100%"/>
        <h3>Merotika</h3>
    </div>
    <div class="case-study">
        <img src="https://cdn.doncez.art/previews/case-study-004.webp" alt="Case Study" style="width: 100%"/>
        <h3>The Social Boost Hub</h3>
    </div>
</div>

<style>
    .logo-long {
        width: 50%;
        margin-left: auto;
        margin-right: auto;
        @media (max-width: 666px) {
            display: none;
        }
    }

    .logo-square {
        width: 100%;
        @media (min-width: 667px) {
            display: none;
        }
    }

    .landing {
        margin-top: 0;
        text-align: center;
        padding-top: 10rem;
        padding-bottom: 10rem;
        @media (max-width: 790px) {
            flex-direction: column-reverse;
            gap: 1rem;
        }
    }

    .case-studies {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        gap: 1rem;
        margin-top: 1rem;
        width: 100%;
        @media (max-width: 1470px) {
            grid-template-columns: 1fr 1fr;
        }
        @media (max-width: 790px) {
            display: flex;
            flex-direction: column;
        }
    }


</style>