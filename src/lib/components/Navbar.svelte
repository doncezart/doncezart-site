<script>
    let is_close = true;
    function dropMenu(){
        is_close = !is_close
    }
</script>

<div class="navbar glasseffect">
    <div class="nav-links-desktop">
        <div class="btn-gap">
            <a href="/work" class="btn-navbar">My work</a>
            <a href="/assets" class="btn-navbar">Free Assets</a>
            <a href="/stocks" class="btn-navbar">AI Stocks</a>
        </div>
        <div class="center">
            <a href='/'><img src="logo-square.svg" alt="DONCEZART Logo"/></a>
        </div>
        <div class="btn-gap">
            <a href="/contact" class="btn-navbar">Discord</a>
            <a href="/socials" class="btn-navbar">Socials</a>
            <a href="/contact" class="btn-navbar">Contact</a>
        </div>
        <!--<button class="btn-navbar" onclick="window.location.href='/asset-store'">Asset Store</button>-->
    </div>
    <button class="hamburger" class:h-active={is_close} on:click={dropMenu}>X</button>
</div>
<div class="nav-links-mobile" class:show={is_close} id="menu-mobile">
    <a href="/work" class="btn-navbar">My work</a>
    <a href="/socials" class="btn-navbar">Socials</a>
    <a href="/contact" class="btn-navbar">Get in Touch</a>
    <a href="/assets" class="btn-navbar">Asset Store</a>
</div>



<style>
    .glasseffect {
        background: rgba(0, 0, 0, 0.8); /* Semi-transparent background */
        backdrop-filter: blur(50px); /* Blurs the area behind the element */
        -webkit-backdrop-filter: blur(50px); /* Ensures compatibility with Safari */
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Adds a shadow to give it a 3D effect */
    }
    .btn-gap{
        display: flex;
        justify-content: space-between;
        gap: 32px;
    }
    .center{
        left: 50%;
        position: absolute;
        transform: translateX(-50%);
    }
    .navbar {
        align-items: center;
        display: flex;
        justify-content: start;
        
        position: sticky;
        top: 0;
        
        height: 2.5rem;
        margin-left: auto;
        margin-right: auto;
        padding: 1rem 2rem 1rem 2rem;
        
        
    }
    @media (max-width: 666px){
        .navbar{
            padding: 1rem 2rem 1rem 2rem;
            height: 2rem
        }
    }

    img {
        margin: 0;
        height: 2rem;
        transition: height 0.2s ease;
        width: auto;
    }

    img:hover {
        height: 2.2rem;   
    }

    /* NAVBAR ON DESKTOP */

    .nav-links-desktop {
        margin-left: auto;
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        max-width: 1920px;
        margin-left: auto;
        margin-right: auto;
        @media (max-width:666px) {
            display: none
        }
    }

    .hamburger {
        margin-left: auto;
        background: rgba(0,0,0,0);
        border: 0;
        font-family: 'Yapari Variable Trial';
        color: white;
        @media (min-width: 667px) {
            display:none
        }
    }

    .h-active {
        font-family: 'Yapari Trial'
    }

    .btn-navbar{
        background-color: rgba(0,0,0,0);
        border: 0;
        color: #8B989C;
        transition: color 0.2s ease;
        
        text-align: center;
        text-decoration: none;
        
        font-family: 'Satoshi';
        font-weight: 500;
        font-size: 16px;
    }

    @media (max-width:667px) {
        .btn-navbar{
            padding-top: 0.25rem;
            padding-bottom: 0.25rem;
        }
    }

    .btn-navbar:hover {
        cursor: pointer;
        color: white;
    }

    /* NAVBAR ON MOBILE */

    .nav-links-mobile{
        background: black;
        position: sticky;
        top: 3.2rem;
        display: flex;
        flex-direction: column;
        margin-left: auto;
        margin-right: auto;
        padding-bottom: 0.5rem;
        border-bottom: solid 0.1rem white;
    }

    .show{
        display: none;
    }


</style>