<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>Create Account - Tidye265</title>

    <!-- Fonts & Icons -->
    <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
    >

    <link
        href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;700&family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet"
    >

    <style>

        :root{
            --gold:#FFD700;
            --dark:#111827;
            --gray:#6b7280;
            --soft:#f3f4f6;
            --border:#e5e7eb;
            --success:#10b981;
        }

        *{
            margin:0;
            padding:0;
            box-sizing:border-box;
            -webkit-tap-highlight-color:transparent;
        }

        body{
            background:#fff;
            color:var(--dark);
            font-family:'Inter',sans-serif;
            overflow-x:hidden;
            padding-bottom:90px;
        }

        /* HEADER */

        .top-header{
            height:72px;
            padding:0 20px;
            display:flex;
            align-items:center;
            justify-content:space-between;
            border-bottom:1px solid var(--border);
            background:#fff;
        }

        .logo img{
            height:42px;
            border-radius:8px;
        }

        .login-btn{
            text-decoration:none;
            border:1.5px solid var(--dark);
            color:var(--dark);
            padding:9px 18px;
            border-radius:10px;
            font-size:13px;
            font-family:'Lexend';
            font-weight:700;
        }

        /* MAIN */

        .register-wrapper{
            width:100%;
            max-width:420px;
            margin:0 auto;
            padding:35px 20px 40px;
        }

        .steps{
            display:flex;
            align-items:center;
            justify-content:center;
            margin-bottom:40px;
            font-family:'Lexend';
            font-size:13px;
        }

        .circle{
            width:24px;
            height:24px;
            border-radius:50%;
            display:inline-flex;
            align-items:center;
            justify-content:center;
            background:var(--gold);
            font-size:11px;
            font-weight:700;
            margin-right:6px;
        }

        .line{
            width:35px;
            height:1px;
            background:#d1d5db;
            margin:0 12px;
        }

        .inactive{
            color:var(--gray);
        }

        .inactive .circle{
            background:#fff;
            border:1px solid #d1d5db;
        }

        .title{
            margin-bottom:30px;
        }

        .title h1{
            font-family:'Lexend';
            font-size:30px;
            line-height:1.2;
            margin-bottom:10px;
        }

        .title p{
            color:var(--gray);
            font-size:14px;
        }

        .register-form{
            display:flex;
            flex-direction:column;
            gap:18px;
        }

        .input-box{
            position:relative;
        }

        .input-box input{
            width:100%;
            height:56px;
            border:none;
            outline:none;
            background:var(--soft);
            border:1.5px solid transparent;
            border-radius:14px;
            padding:0 16px;
            font-size:15px;
            font-family:'Inter';
            transition:0.25s ease;
        }

        .input-box input:focus{
            background:#fff;
            border-color:var(--dark);
            box-shadow:0 8px 25px rgba(0,0,0,0.05);
        }

        /* PHONE */

        .phone-box img{
            position:absolute;
            left:16px;
            top:50%;
            transform:translateY(-50%);
            width:26px;
            height:18px;
            object-fit:cover;
            border-radius:2px;
            z-index:2;
        }

        .phone-box input{
            padding-left:58px;
        }

        /* LEGAL */

        .legal{
            display:flex;
            align-items:flex-start;
            gap:10px;
            margin-top:2px;
        }

        .legal input{
            margin-top:3px;
            width:18px;
            height:18px;
            accent-color:#111827;
        }

        .legal p{
            font-size:13px;
            color:var(--gray);
            line-height:1.5;
        }

        /* BUTTON */

        .submit-btn{
            height:56px;
            border:none;
            border-radius:14px;
            background:var(--gold);
            color:#000;
            font-family:'Lexend';
            font-weight:700;
            font-size:15px;
            cursor:pointer;
            transition:0.2s ease;
        }

        .submit-btn.loading{
            opacity:.7;
            pointer-events:none;
        }

        .submit-btn:active{
            transform:scale(.98);
        }

        /* ALERT */

        .alert{
            padding:15px;
            border-radius:12px;
            font-size:14px;
            display:none;
        }

        .alert.success{
            background:#ecfdf5;
            color:#065f46;
            border:1px solid #a7f3d0;
        }

        .alert.error{
            background:#fef2f2;
            color:#991b1b;
            border:1px solid #fecaca;
        }

        /* BOTTOM */

        .bottom-text{
            margin-top:25px;
            text-align:center;
            font-size:14px;
            color:var(--gray);
        }

        .bottom-text a{
            color:var(--dark);
            font-weight:700;
            text-decoration:none;
        }

        /* FINISH */

        .finish-screen{
            display:none;
            text-align:center;
            padding:60px 20px;
        }

        .finish-icon{
            width:90px;
            height:90px;
            border-radius:50%;
            background:#ecfdf5;
            color:var(--success);
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:40px;
            margin:0 auto 25px;
        }

        .finish-screen h2{
            font-family:'Lexend';
            margin-bottom:10px;
            font-size:28px;
        }

        .finish-screen p{
            color:var(--gray);
            line-height:1.6;
            font-size:14px;
        }

    </style>
</head>
<body>

<header class="top-header">

    <a href="index.php" class="logo">
        <img src="logo.jpg" alt="Tidye265">
    </a>

    <a href="login.php" class="login-btn">
        LOGIN
    </a>

</header>

<main class="register-wrapper">

    <!-- REGISTER SECTION -->
    <div id="registerSection">

        <div class="steps">

            <span>
                <span class="circle">1</span>
                Sign Up
            </span>

            <span class="line"></span>

            <span class="inactive" id="finishStep">
                <span class="circle">2</span>
                Finish
            </span>

        </div>

        <div class="title">
            <h1>Create Account</h1>

            <p>
                Join Tidye265 and start playing professional Malawi games.
            </p>
        </div>

        <div id="alertBox" class="alert"></div>

        <form
            class="register-form"
            id="registerForm"
        >

            <div class="input-box">
                <input
                    type="text"
                    id="username"
                    placeholder="Username"
                    required
                >
            </div>

            <div class="input-box phone-box">

                <img
                    src="https://flagcdn.com/w40/mw.png"
                    alt="Malawi"
                >

                <input
                    type="tel"
                    id="phone"
                    placeholder="Phone Number"
                    required
                >

            </div>

            <div class="input-box">
                <input
                    type="password"
                    id="pin"
                    maxlength="6"
                    inputmode="numeric"
                    placeholder="Secret PIN"
                    required
                >
            </div>

            <label class="legal">

                <input
                    type="checkbox"
                    required
                >

                <p>
                    I confirm that I am
                    <b>18 years or older</b>
                    and I agree to the Terms of Service.
                </p>

            </label>

            <button
                type="submit"
                class="submit-btn"
                id="submitBtn"
            >
                REGISTER NOW
            </button>

        </form>

        <p class="bottom-text">
            Already have an account?
            <a href="login.php">
                Login here
            </a>
        </p>

    </div>

    <!-- SUCCESS SCREEN -->

    <div
        class="finish-screen"
        id="finishScreen"
    >

        <div class="finish-icon">
            <i class="fa-solid fa-check"></i>
        </div>

        <h2>
            Registration Successful
        </h2>

        <p>
            Your Tidye265 account has been created successfully.
            <br>
            Redirecting to dashboard...
        </p>

    </div>

</main>

<!-- SUPABASE -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- CONFIG -->
<script src="supabase.js"></script>

<script>

    const registerForm =
        document.getElementById('registerForm');

    const submitBtn =
        document.getElementById('submitBtn');

    const alertBox =
        document.getElementById('alertBox');

    const registerSection =
        document.getElementById('registerSection');

    const finishScreen =
        document.getElementById('finishScreen');

    const finishStep =
        document.getElementById('finishStep');

    /*
    ============================
    ALERT
    ============================
    */

    function showAlert(message, type='error'){

        alertBox.style.display = 'block';

        alertBox.className =
            'alert ' + type;

        alertBox.innerHTML = message;

        window.scrollTo({
            top:0,
            behavior:'smooth'
        });
    }

    /*
    ============================
    REGISTER
    ============================
    */

    registerForm.addEventListener(
        'submit',
        async (e)=>{

            e.preventDefault();

            submitBtn.classList.add('loading');

            submitBtn.innerHTML =
                'Creating Account...';

            alertBox.style.display = 'none';

            const username =
                document.getElementById('username')
                .value
                .trim();

            const phone =
                document.getElementById('phone')
                .value
                .trim();

            const pin =
                document.getElementById('pin')
                .value
                .trim();

            /*
            VALIDATION
            */

            if(pin.length < 4){

                showAlert(
                    'PIN must be at least 4 digits.'
                );

                submitBtn.classList.remove('loading');

                submitBtn.innerHTML =
                    'REGISTER NOW';

                return;
            }

            try{

                /*
                CHECK USER
                */

                const {
                    data:existingUser
                } = await supabaseClient
                    .from('users')
                    .select('id')
                    .eq('phone', phone)
                    .maybeSingle();

                if(existingUser){

                    showAlert(
                        'Phone number already registered.'
                    );

                    submitBtn.classList.remove('loading');

                    submitBtn.innerHTML =
                        'REGISTER NOW';

                    return;
                }

                /*
                INSERT USER
                */

                const { error } =
                    await supabaseClient
                    .from('users')
                    .insert([
                        {
                            username:username,
                            phone:phone,
                            pin:pin,
                            balance:0
                        }
                    ]);

                if(error){

                    showAlert(
                        error.message
                    );

                    submitBtn.classList.remove('loading');

                    submitBtn.innerHTML =
                        'REGISTER NOW';

                    return;
                }

                /*
                SAVE SESSION
                */

                localStorage.setItem(
                    'tidye265_phone',
                    phone
                );

                /*
                SUCCESS
                */

                registerSection.style.display =
                    'none';

                finishScreen.style.display =
                    'block';

                finishStep.classList.remove(
                    'inactive'
                );

                /*
                REDIRECT
                */

                setTimeout(()=>{

                    window.location.href =
                        'dashboard.php';

                }, 2000);

            }catch(error){

                console.log(error);

                showAlert(
                    'Something went wrong. Please try again.'
                );

                submitBtn.classList.remove('loading');

                submitBtn.innerHTML =
                    'REGISTER NOW';
            }

        }
    );

</script>

<?php include 'footer.php'; ?>

</body>
</html>
