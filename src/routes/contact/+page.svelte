<script>
	export let form;
</script>

<div class="body">
    <div style="text-align: center">
        <h1>Get in touch with me</h1>
        <p>Send me a message by using the following form or use the alternative methods below</p>
    </div>

    
    <form method="POST" action="?/contact">
        {#if form?.missing_email}<p style="color: red;">The email field is required</p>{/if}
        {#if form?.missing_name}<p style="color: red;">The name field is required</p>{/if}
        {#if form?.missing_message}<p style="color: red;">The message field is required</p>{/if}
        {#if form?.success}<p style="color: green;">Message sent successfully</p>{/if}
        <div class="fields">
            <div style="width: 100%">
                <label for="email">Email address</label>
                <textarea style= "height: 2.5rem" name="email" class:error={form?.missing_email} maxlength="50" placeholder="john@doe.com" value={form?.email ?? ''}></textarea>
            </div>

            <div style="width: 100%">
                <label for="name">Name</label>
                <textarea style= "height: 2.5rem" name="name" class:error={form?.missing_name} maxlength="50" placeholder="John Doe" value={form?.name ?? ''}></textarea>
            </div>
        </div>

        <div class="message">
            <label for="message">Message</label>
            <textarea style="height: 5rem" name="message" class:error={form?.missing_message} placeholder="Message" maxlength="1000" value={form?.message ?? ''}></textarea>
        </div>

        <button class="btn main-border" style="width: 100%">Send message</button>
    </form>

    <p style="text-align:center; margin-top: 2rem">Can't complete the form? Send me an email at <a href="mailto:tiniu@ceza.ro">me@doncez.art</a> or reach me on my <a href="/socials">socials</a>.</p>
    
</div>

<style>
    form{
        display: flex;
        flex-direction: column;
        gap: 1rem;
        max-width: 60rem;
        margin-left: auto;
        margin-right: auto;
        margin-top: 2rem;
    }

    label {
        font-family: 'Satoshi';
        color: white;
        margin: 0;
        margin-bottom: 0.5rem;
    }

    textarea {
        background-color: rgba(0,0,0,0);
        color: white;
        border: solid 0.1rem white;
        font-family: 'Satoshi';
        padding: 0.5rem;
        width: 100%;
        box-sizing: border-box;
    }

    textarea:focus {
        outline: none
    }

    .fields{
        display: flex;
        gap: 1rem;
        @media (max-width:666px) {
            flex-direction: column
        }
    }

    .error{
        border: solid 0.1rem red;
    }
</style>