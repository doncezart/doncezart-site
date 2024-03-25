<script>
    let is_close = true;
    function dropMenu(){
        is_close = !is_close
    }
</script>

<div class="navbar">
    <a href='/'><img src="logo-square.svg" alt="DONCEZART Logo"/></a>
    <div class="nav-links-desktop">
        <button class="btn-navbar" onclick="window.location.href='/'">Home</button>
        <button class="btn-navbar" onclick="window.location.href='/my-work'">My work</button>
        <button class="btn-navbar" onclick="window.location.href='/socials'">Socials</button>
        <button class="btn-navbar" onclick="window.location.href='/contact'">Get in Touch</button>
        <button class="btn-navbar cta" onclick="window.location.href='/asset-store'">Asset Store</button>
    </div>
    <button class="hamburger" class:h-active={is_close} on:click={dropMenu}>X</button>
</div>
<div class="nav-links-mobile" class:show={is_close} id="menu-mobile">
    <button class="btn-navbar" onclick="window.location.href='/#work'">My work</button>
    <button class="btn-navbar" onclick="window.location.href='/socials'">Socials</button>
    <button class="btn-navbar" onclick="window.location.href='/contact'">Get in Touch</button>
    <button class="btn-navbar" onclick="window.location.href='/asset-store'">Asset Store</button>
</div>



<style>
    .navbar {
        align-items: center;
        display: flex;
        justify-content: start;
        background-color: black;
        position: sticky;
        top: 0;
        padding: 1.5rem 2rem 1.5rem 2rem;
        height: 2.5rem;
        margin: 0;
        @media (max-width: 666px){padding: 1rem 2rem 1rem 2rem; height: 2rem};
    }

    img {
        margin: 0;
        height: 2rem;
        width: auto;
    }

    img:hover {
        height: 2.2rem;
    }

    /* NAVBAR ON DESKTOP */

    .nav-links-desktop {
        margin-left: auto;
        color: white;
        display: grid;
        grid-auto-flow: column;
        gap: 2rem;
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
        color: white;
        
        font-family: 'Satoshi';
        font-weight: 400;
        font-size: 1rem;
        @media (max-width:667px) {
            padding-top: 0.25rem;
            padding-bottom: 0.25rem;
        };
    }

    .btn-navbar:hover {
        cursor: pointer;
        text-decoration: underline;
    }

    .cta {
        border: solid 0.1rem white;
        padding-left: 1rem;
        padding-right: 1rem;
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