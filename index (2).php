<?php
// Titha kuika logic ya PHP m'tsogolo muno ngati check_login etc.
$current_year = date("Y");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MomoCash | Earn Money Worldwide</title>
    <meta name="description" content="Join MomoCash and earn real money globally by watching videos, completing simple tasks, and inviting friends.">
    
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'golf-354741': '#E5B80B', // Professional Dark Yellow
                        'golf-yellow-dark': '#C59D09',
                    },
                    fontFamily: {
                        sans: ['Poppins', 'sans-serif'],
                    }
                }
            }
        }
    </script>

    <style>
        body { background-color: #ffffff; color: #1f2937; }
        
        /* Preloader CSS Animation */
        #preloader {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: #ffffff; z-index: 9999;
            display: flex; justify-content: center; align-items: center;
            transition: opacity 0.6s ease-out, visibility 0.6s ease-out;
        }
        .loader-logo {
            width: 120px;
            animation: pulse-logo 1.5s infinite;
        }
        @keyframes pulse-logo {
            0% { transform: scale(0.9); opacity: 0.7; }
            50% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(0.9); opacity: 0.7; }
        }

        /* Custom UI Enhancements */
        .glass-nav { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); border-bottom: 1px solid #f3f4f6; }
        .feature-card { transition: all 0.3s ease; }
        .feature-card:hover { transform: translateY(-10px); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); border-color: #E5B80B; }
    </style>
</head>
<body class="antialiased overflow-x-hidden">

    <div id="preloader">
        <img src="logo.jpg" alt="MomoCash Loading" class="loader-logo">
    </div>

    <nav class="fixed w-full z-50 glass-nav transition-all duration-300">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-20 items-center">
                <div class="flex-shrink-0 flex items-center gap-3">
                    <img src="logo.jpg" alt="MomoCash" class="h-10 w-auto">
                    <span class="font-extrabold text-2xl tracking-tight">Momo<span class="text-golf-yellow">Cash</span></span>
                </div>
                <div class="hidden md:flex space-x-8 items-center">
                    <a href="#how-it-works" class="text-gray-600 hover:text-golf-yellow font-semibold transition">How it Works</a>
                    <a href="#earn" class="text-gray-600 hover:text-golf-yellow font-semibold transition">Earning Methods</a>
                    <a href="login.php" class="text-gray-900 font-bold hover:text-golf-yellow transition">Login</a>
                    <a href="sign-up.php" class="bg-golf-yellow hover:bg-golf-yellow-dark text-white px-6 py-2.5 rounded-full font-bold shadow-lg shadow-golf-yellow/30 transition-all transform hover:scale-105">
                        Start Earning
                    </a>
                </div>
                <div class="md:hidden flex items-center">
                    <button class="text-gray-600 hover:text-golf-yellow focus:outline-none text-2xl">
                        <i class="fas fa-bars"></i>
                    </button>
                </div>
            </div>
        </div>
    </nav>

    <div class="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div class="absolute inset-0 z-0">
            <div class="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-30"></div>
        </div>
        <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-50 text-golf-yellow-dark font-bold text-sm mb-8 border border-yellow-100 shadow-sm">
                <i class="fas fa-globe-americas"></i> Available Worldwide
            </div>
            <h1 class="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight mb-6 leading-tight">
                Turn Your Free Time Into <br>
                <span class="text-transparent bg-clip-text bg-gradient-to-r from-golf-yellow to-yellow-600">Real Cash.</span>
            </h1>
            <p class="mt-4 max-w-2xl text-lg md:text-xl text-gray-500 mx-auto mb-10">
                Join MomoCash today. Complete simple tasks, watch entertaining videos, and get paid directly to your wallet. No hidden fees, just pure earnings.
            </p>
            <div class="flex justify-center gap-4 flex-col sm:flex-row">
                <a href="sign-up.php" class="bg-golf-yellow hover:bg-golf-yellow-dark text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl shadow-golf-yellow/20 transition-all transform hover:-translate-y-1">
                    Create Free Account
                </a>
                <a href="login.php" class="bg-white border-2 border-gray-200 text-gray-700 hover:border-golf-yellow hover:text-golf-yellow px-8 py-4 rounded-full font-bold text-lg transition-all">
                    Login to Dashboard
                </a>
            </div>
        </div>
    </div>

    <section id="how-it-works" class="py-20 bg-gray-50 border-t border-gray-100">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">How Do You Earn?</h2>
                <p class="text-gray-500 max-w-2xl mx-auto">We've made it incredibly simple to start making money. No special skills required.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div class="feature-card bg-white p-8 rounded-3xl border border-gray-100 text-center relative overflow-hidden">
                    <div class="w-16 h-16 bg-yellow-50 text-golf-yellow rounded-2xl flex items-center justify-center text-2xl mx-auto mb-6 shadow-sm">
                        <i class="fas fa-user-plus"></i>
                    </div>
                    <h3 class="text-xl font-bold mb-3">1. Sign Up</h3>
                    <p class="text-gray-500 text-sm">Register a free account in less than a minute. Your dashboard is ready instantly.</p>
                </div>
                
                <div class="feature-card bg-white p-8 rounded-3xl border border-gray-100 text-center relative overflow-hidden">
                    <div class="w-16 h-16 bg-yellow-50 text-golf-yellow rounded-2xl flex items-center justify-center text-2xl mx-auto mb-6 shadow-sm">
                        <i class="fas fa-play-circle"></i>
                    </div>
                    <h3 class="text-xl font-bold mb-3">2. Do Tasks & Watch Videos</h3>
                    <p class="text-gray-500 text-sm">Browse our wall of offers. Watch promotional videos or complete simple surveys to earn points.</p>
                </div>

                <div class="feature-card bg-white p-8 rounded-3xl border border-gray-100 text-center relative overflow-hidden">
                    <div class="w-16 h-16 bg-yellow-50 text-golf-yellow rounded-2xl flex items-center justify-center text-2xl mx-auto mb-6 shadow-sm">
                        <i class="fas fa-wallet"></i>
                    </div>
                    <h3 class="text-xl font-bold mb-3">3. Withdraw Funds</h3>
                    <p class="text-gray-500 text-sm">Convert your points to real money and withdraw instantly through our global payment gateways.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="py-20">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="bg-gray-900 rounded-[3rem] p-10 md:p-16 text-center relative overflow-hidden shadow-2xl">
                <div class="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-golf-yellow rounded-full opacity-20 blur-3xl"></div>
                <div class="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-white rounded-full opacity-10 blur-3xl"></div>
                
                <h2 class="text-3xl md:text-5xl font-extrabold text-white mb-6 relative z-10">Ready to build your capital?</h2>
                <p class="text-gray-400 text-lg mb-10 max-w-xl mx-auto relative z-10">Stop wasting time scrolling for free. Start getting paid for your screen time today.</p>
                <a href="sign-up.php" class="relative z-10 inline-block bg-golf-yellow hover:bg-golf-yellow-dark text-white px-10 py-4 rounded-full font-bold text-lg shadow-xl shadow-golf-yellow/30 transition-all transform hover:scale-105">
                    Join MomoCash Now
                </a>
            </div>
        </div>
    </section>

    <footer class="bg-gray-50 border-t border-gray-200 pt-16 pb-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
                <div class="col-span-1 md:col-span-1">
                    <div class="flex items-center gap-2 mb-6">
                        <img src="logo.jpg" alt="MomoCash logo" class="h-8 grayscale opacity-80">
                        <span class="font-extrabold text-xl text-gray-900">Momo<span class="text-gray-500">Cash</span></span>
                    </div>
                    <p class="text-gray-500 text-sm mb-6">Empowering people worldwide to earn financial freedom through simple digital tasks.</p>
                </div>
                
                <div>
                    <h4 class="font-bold text-gray-900 mb-6 uppercase text-sm tracking-wider">Quick Links</h4>
                    <ul class="space-y-3 text-sm text-gray-500">
                        <li><a href="index.php" class="hover:text-golf-yellow transition">Home</a></li>
                        <li><a href="login.php" class="hover:text-golf-yellow transition">Login</a></li>
                        <li><a href="sign-up.php" class="hover:text-golf-yellow transition">Register</a></li>
                    </ul>
                </div>

                <div>
                    <h4 class="font-bold text-gray-900 mb-6 uppercase text-sm tracking-wider">Legal</h4>
                    <ul class="space-y-3 text-sm text-gray-500">
                        <li><a href="#" class="hover:text-golf-yellow transition">Terms of Service</a></li>
                        <li><a href="#" class="hover:text-golf-yellow transition">Privacy Policy</a></li>
                    </ul>
                </div>

                <div>
                    <h4 class="font-bold text-gray-900 mb-6 uppercase text-sm tracking-wider">Support</h4>
                    <p class="text-sm text-gray-500 mb-3">Need help with your deposits or withdrawals?</p>
                    <a href="mailto:momocash265@gmail.com" class="inline-flex items-center text-golf-yellow-dark font-bold hover:text-golf-yellow transition">
                        <i class="fas fa-envelope mr-2"></i> momocash265@gmail.com
                    </a>
                </div>
            </div>
            
            <div class="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center">
                <p class="text-sm text-gray-400">
                    &copy; <?php echo $current_year; ?> MomoCash Inc. All rights reserved.
                </p>
                <div class="flex space-x-4 mt-4 md:mt-0 text-gray-400">
                    <a href="#" class="hover:text-golf-yellow transition"><i class="fab fa-facebook-f"></i></a>
                    <a href="#" class="hover:text-golf-yellow transition"><i class="fab fa-twitter"></i></a>
                    <a href="#" class="hover:text-golf-yellow transition"><i class="fab fa-telegram-plane"></i></a>
                </div>
            </div>
        </div>
    </footer>

    <script>
        // Chotsa loading screen ikangomaliza ku-load website
        window.addEventListener('load', function() {
            const preloader = document.getElementById('preloader');
            preloader.style.opacity = '0';
            preloader.style.visibility = 'hidden';
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 600);
        });
    </script>
</body>
</html>