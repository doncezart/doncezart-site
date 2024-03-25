<img src="logo-long.svg" alt="DONCEZART Logo" class="logo-long"/>
<img src="logo-square.svg" alt="DONCEZART Logo" class="logo-square"/>

<div class="landing">    
    <p style="max-width: 50rem">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;An artist with an expansive skill set, my expertise lies across various creative domains. Ranging from the technical intricacies of UI/UX and Social Media Design to the more artistic realms of Illustrations and Special Video Effects, my proficiency spans the spectrum of creative pursuits.</p>
    <p style="text-align: right; width: 100%">22 years old from Romania</p>
</div>


<div class="banners">
    <div class="landing-card discord-card">
        <div>
            <h1 style="font-weight: 500; color: #7289DA">DISCORD</h1>
            <h1 style="font-weight: 500">SERVER</h1>
        </div>
        <p>Made by creatives, for creatives. Filled with inspiration, motivation, resources and guides.</p>
        <button class="btn" style="font-weight: 600" onclick="window.location.href='https://discord.com/invite/VGsBV22RTN'">Join</button>
    </div>
    <div class="landing-card store-card">
        <div>
            <h1 style="font-weight: 500; color: #DA8472">ASSET</h1>
            <h1 style="font-weight: 500">STORE</h1>
        </div>
        <p>High quality assets personally produced by me, available for no cost - just grab and use.</p>
        <button class="btn" style="font-weight: 600" onclick="window.location.href='/asset-store'">Visit</button>
    </div>
</div>

<h1>Case Studies</h1>
<div class="case-studies">
    <div class="case-study">
        <img src="https://doncezart.nyc3.cdn.digitaloceanspaces.com/previews/case-study-001.webp" alt="Case Study" style="width: 100%"/>
        <div class="study-nav">
            <div style="width: 100%">
                <h3>DONCEZART</h3>
                <p>Personal Brand</p>
            </div>
            <button class="btn main-border" onclick="window.location.href='/work-in-progress'">View</button>
        </div>
    </div>
    <div class="case-study">
        <img src="https://doncezart.nyc3.cdn.digitaloceanspaces.com/previews/case-study-002.webp" alt="Case Study" style="width: 100%"/>
        <div class="study-nav">
            <div style="width: 100%">
                <h3>PIM</h3>
                <p>Finance Community</p>
            </div>
            <button class="btn main-border" onclick="window.location.href='/work-in-progress'">View</button>
        </div>
    </div>
    <div class="case-study">
        <img src="https://doncezart.nyc3.cdn.digitaloceanspaces.com/previews/case-study-003.webp" alt="Case Study" style="width: 100%"/>
        <div class="study-nav">
            <div style="width: 100%">
                <h3>Merotika</h3>
                <p>Mature Service Provider</p>
            </div>
            <button class="btn main-border" onclick="window.location.href='/work-in-progress'">View</button>
        </div>
    </div>
    <div class="case-study">
        <img src="https://doncezart.nyc3.cdn.digitaloceanspaces.com/previews/case-study-004.webp" alt="Case Study" style="width: 100%"/>
        <div class="study-nav">
            <div style="width: 100%">
                <h3>Ghost Node</h3>
                <p>Hosting Provider</p>
            </div>
            <button class="btn main-border" onclick="window.location.href='/work-in-progress'">View</button>
        </div>
    </div>
</div>

<style>
    .logo-long {
        width: 100%;
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
        display: flex;
        margin-top: 1rem;
        margin-bottom: 5rem;
        @media (max-width: 790px) {
            flex-direction: column-reverse;
            gap: 1rem;
        }
    }

    .banners {
        display: flex;
        gap: 1rem;
        margin-bottom: 5rem;
        @media (max-width: 1470px) {
            flex-direction: column;
        };
    }

    .landing-card {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: auto auto 8rem;
        column-gap: 1rem;
        width: 50%;
        padding: 1rem;
        border: solid 0.2rem white;
        @media (max-width: 790px) {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        };
        @media (max-width: 1470px) {
            width: auto;
        }
    }

    .discord-card {
        border: solid 0.2rem #7289DA;
    }

    .store-card {
        border: solid 0.2rem #DA8472;
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

    .study-nav {
        margin-top: 1rem;
        display: flex;
        flex-direction: row;
        @media (max-width: 790px) {
            flex-direction: column;
            gap: 0.5rem;
        }
    }

    .study-nav > button {
        text-align: right;
        @media (max-width: 790px) {
            text-align: center;
        }
    }
</style>