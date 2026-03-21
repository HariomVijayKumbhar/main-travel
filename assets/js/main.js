/**
 * Maharaja Travels - Main JavaScript Logic
 * Handles Authentication, Booking, Search, and UI Interactions
 */

// --- Database Module ---
const Database = {
    init: function() {
        if (!localStorage.getItem("users")) {
            localStorage.setItem("users", JSON.stringify([]));
        }
    },
    Users: {
        create: function(user) {
            const users = JSON.parse(localStorage.getItem("users"));
            user.id = 'USR' + Date.now();
            users.push(user);
            localStorage.setItem("users", JSON.stringify(users));
            return user;
        },
        findByEmail: function(email) {
            const users = JSON.parse(localStorage.getItem("users"));
            return users.find(u => u.email === email);
        },
        verify: function(email, password) {
            const users = JSON.parse(localStorage.getItem("users"));
            return users.find(u => u.email === email && u.password === password);
        }
    },
    Bookings: {
        add: function(booking) {
            return DB.addBooking(booking);
        },
        getAll() {
            return DB.getAllBookings();
        },
        getByUser(email) {
            return DB.getBookingsByEmail(email);
        }
    }
};

// --- Authentication Module ---
const Auth = {
    init: function () {
        this.updateUI();
        this.bindEvents();
    },

    bindEvents: function () {
        document.body.addEventListener('submit', (e) => {
            if (e.target && e.target.id === 'loginPageForm') {
                e.preventDefault();
                this.login();
            }
            if (e.target && e.target.id === 'registerPageForm') {
                e.preventDefault();
                this.register();
            }
        });

        document.addEventListener("click", (e) => {
            if (e.target && (e.target.id === "logoutBtn" || e.target.id === "logoutBtnNav")) {
                e.preventDefault();
                this.logout();
            }
            if (e.target && e.target.id === "historyBtn") {
                e.preventDefault();
                Payment.showHistory();
            }
        });

        // Listen for localStorage changes (for cross-tab login/logout)
        window.addEventListener('storage', (e) => {
            if (e.key === 'currentUser') {
                this.updateUI();
            }
        });
    },

    register: async function () {
        const name = document.getElementById("registerName").value;
        const email = document.getElementById("registerEmail").value;
        const password = document.getElementById("registerPassword").value;
        const confirmPassword = document.getElementById("registerConfirmPassword").value;

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const result = await response.json();

            if (response.ok) {
                alert("Registration Successful! Welcome to Maharaja Travels.");
                window.location.href = "login.html";
            } else {
                alert("Registration failed: " + (result.error || result.message || "Unknown error (Status: " + response.status + ")"));
            }
        } catch (error) {
            console.error("Registration error:", error);
            alert("An error occurred during registration. Please check if the server is running.");
        }
    },

    login: async function () {
        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (response.ok) {
                localStorage.setItem("currentUser", JSON.stringify({
                    name: result.user.user_metadata.full_name || result.user.email,
                    email: result.user.email,
                    id: result.user.id
                }));
                localStorage.setItem("supabaseSession", JSON.stringify(result.session));
                
                alert(`Welcome back, ${result.user.user_metadata.full_name || result.user.email}!`);
                window.location.href = window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
            } else {
                let errorMsg = result.error || result.message || "Unknown error";
                if (errorMsg.toLowerCase().includes("email not confirmed")) {
                    errorMsg = "Your email is not confirmed yet. Please check your inbox (and spam folder) for the verification link.";
                }
                alert("Login failed: " + errorMsg);
            }
        } catch (error) {
            console.error("Login error:", error);
            alert("An error occurred during login. Please check if the server is running.");
        }
    },

    logout: function () {
        if (confirm("Are you sure you want to logout?")) {
            localStorage.removeItem("currentUser");
            if (window.location.pathname.includes('profile.html')) {
                window.location.href = "../index.html";
            } else {
                this.updateUI();
                window.location.reload();
            }
        }
    },

    isLoggedIn: function () {
        return !!localStorage.getItem("currentUser");
    },

    getCurrentUser: function () {
        return JSON.parse(localStorage.getItem("currentUser"));
    },

    updateUI: function () {
        const user = this.getCurrentUser();
        document.body.classList.toggle('user-logged-in', !!user);

        const navList = document.querySelector(".navbar-nav");
        const authContainers = document.querySelectorAll(".nav-auth-container");
        const authLinks = document.querySelectorAll(".auth-link, a[href*='register.html']");
        
        if (user) {
            authContainers.forEach(el => el.classList.add('d-none'));
            authLinks.forEach(el => el.classList.add('d-none'));
        } else {
            authContainers.forEach(el => el.classList.remove('d-none'));
            authLinks.forEach(el => el.classList.remove('d-none'));
        }

        if (!navList) return;

        const existingAuthItems = document.querySelectorAll(".auth-item");
        existingAuthItems.forEach((el) => el.remove());

        if (user) {
            const isSubPage = window.location.pathname.includes('/pages/');
            const profilePath = isSubPage ? 'profile.html' : 'pages/profile.html';
            
            // Create user dropdown menu using safe DOM manipulation
            const userItem = document.createElement('li');
            userItem.className = 'nav-item auth-item dropdown';
            
            const dropdownLink = document.createElement('a');
            dropdownLink.className = 'nav-link dropdown-toggle d-flex align-items-center';
            dropdownLink.href = '#';
            dropdownLink.id = 'navbarDropdown';
            dropdownLink.setAttribute('role', 'button');
            dropdownLink.setAttribute('data-bs-toggle', 'dropdown');
            dropdownLink.setAttribute('aria-expanded', 'false');
            
            const avatarImg = document.createElement('img');
            avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`;
            avatarImg.className = 'nav-avatar rounded-circle me-2';
            avatarImg.alt = 'Profile';
            avatarImg.style.cssText = 'width: 32px; height: 32px; object-fit: cover; border: 2px solid var(--primary);';
            
            const userNameSpan = document.createElement('span');
            userNameSpan.textContent = user.name;
            
            dropdownLink.appendChild(avatarImg);
            dropdownLink.appendChild(userNameSpan);
            
            const dropdownMenu = document.createElement('ul');
            dropdownMenu.className = 'dropdown-menu dropdown-menu-end shadow-lg border-0';
            dropdownMenu.setAttribute('aria-labelledby', 'navbarDropdown');
            dropdownMenu.style.cssText = 'background: var(--bg-card); backdrop-filter: blur(16px);';
            
            const profileItem = document.createElement('li');
            const profileLink = document.createElement('a');
            profileLink.className = 'dropdown-item py-2';
            profileLink.href = profilePath;
            const profileIcon = document.createElement('i');
            profileIcon.className = 'fa-solid fa-user me-2 text-primary';
            profileLink.appendChild(profileIcon);
            profileLink.appendChild(document.createTextNode('My Profile'));
            profileItem.appendChild(profileLink);
            
            const dividerItem = document.createElement('li');
            const divider = document.createElement('hr');
            divider.className = 'dropdown-divider opacity-10';
            dividerItem.appendChild(divider);
            
            const logoutItem = document.createElement('li');
            const logoutLink = document.createElement('a');
            logoutLink.className = 'dropdown-item py-2 text-danger';
            logoutLink.href = '#';
            logoutLink.id = 'logoutBtn';
            const logoutIcon = document.createElement('i');
            logoutIcon.className = 'fa-solid fa-right-from-bracket me-2';
            logoutLink.appendChild(logoutIcon);
            logoutLink.appendChild(document.createTextNode('Logout'));
            logoutItem.appendChild(logoutLink);
            
            dropdownMenu.appendChild(profileItem);
            dropdownMenu.appendChild(dividerItem);
            dropdownMenu.appendChild(logoutItem);
            
            userItem.appendChild(dropdownLink);
            userItem.appendChild(dropdownMenu);
            
            navList.appendChild(userItem);
            
            // Add event listener for the logout button
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        } else {
            if (window.location.pathname.includes('profile.html')) {
                window.location.href = "login.html";
            }
        }
    },
};

// --- Profile Module ---
const Profile = {
    init: function() {
        if (!window.location.pathname.includes('profile.html')) return;
        const user = Auth.getCurrentUser();
        if (!user) {
            window.location.href = "login.html";
            return;
        }
        this.loadUserData(user);
        this.loadBookings(user.email);
    },

    loadUserData: function(user) {
        const nameEl = document.getElementById('profileName');
        const emailEl = document.getElementById('profileEmail');
        if(nameEl) nameEl.textContent = user.name;
        if(emailEl) emailEl.textContent = user.email;
    },

    loadBookings: function(email) {
        Database.Bookings.getByUser(email).then(bookings => {
            const tbody = document.getElementById('profileBookingsBody');
            const noBookingsMsg = document.getElementById('noBookingsMsg');
            if (!tbody) return;
            tbody.innerHTML = '';

            if (bookings.length === 0) {
                tbody.closest('table').classList.add('d-none');
                if(noBookingsMsg) noBookingsMsg.classList.remove('d-none');
            } else {
                tbody.closest('table').classList.remove('d-none');
                if(noBookingsMsg) noBookingsMsg.classList.add('d-none');

                bookings.forEach(booking => {
                    const row = document.createElement('tr');
                    
                    const dateCell = document.createElement('td');
                    const dateDiv = document.createElement('div');
                    dateDiv.className = 'fw-bold';
                    dateDiv.textContent = booking.date ? new Date(booking.date).toLocaleDateString() : 'N/A';
                    const dateSmall = document.createElement('small');
                    dateSmall.className = 'text-muted';
                    dateSmall.textContent = `ID: ${booking.id || '-'}`;
                    dateCell.appendChild(dateDiv);
                    dateCell.appendChild(dateSmall);
                    
                    const packageCell = document.createElement('td');
                    const packageDiv = document.createElement('div');
                    packageDiv.className = 'fw-bold text-primary';
                    packageDiv.textContent = booking.package;
                    const packageSmall = document.createElement('small');
                    packageSmall.textContent = `${booking.travelers} Travelers`;
                    packageCell.appendChild(packageDiv);
                    packageCell.appendChild(packageSmall);
                    
                    const totalCell = document.createElement('td');
                    const totalDiv = document.createElement('div');
                    totalDiv.className = 'fw-bold';
                    totalDiv.textContent = booking.total;
                    const totalSmall = document.createElement('small');
                    totalSmall.className = 'text-muted';
                    totalSmall.textContent = booking.method || 'Pending';
                    totalCell.appendChild(totalDiv);
                    totalCell.appendChild(totalSmall);
                    
                    const statusCell = document.createElement('td');
                    const statusSpan = document.createElement('span');
                    statusSpan.className = `badge bg-${booking.status === 'Confirmed' ? 'success' : 'warning'} rounded-pill`;
                    statusSpan.textContent = booking.status;
                    statusCell.appendChild(statusSpan);
                    
                    row.appendChild(dateCell);
                    row.appendChild(packageCell);
                    row.appendChild(totalCell);
                    row.appendChild(statusCell);
                    
                    tbody.appendChild(row);
                });
            }
        });
    }
};

// --- Search Module ---
const Search = {
    init: function () {
        const searchInput = document.getElementById("searchDestinations");
        const destinationsContainer = document.getElementById("destinationsContainer");

        if (searchInput && destinationsContainer) {
            const destinationCards = destinationsContainer.getElementsByClassName("col-lg-4");
            searchInput.addEventListener("input", function () {
                const filter = this.value.toLowerCase();
                Array.from(destinationCards).forEach(function (card) {
                    const title = card.querySelector(".destination-info h3").textContent.toLowerCase();
                    const description = card.querySelector(".destination-info p").textContent.toLowerCase();
                    if (title.includes(filter) || description.includes(filter)) {
                        card.style.display = "";
                    } else {
                        card.style.display = "none";
                    }
                });
            });
        }
    },
};

// --- Offer Module ---
const Offer = {
    init: function() {
        this.checkClaimedOffer();
    },
    checkClaimedOffer: function() {
        const claimedOffer = JSON.parse(localStorage.getItem("claimedOffer"));
        if (claimedOffer) {
            console.log("Claimed Offer found:", claimedOffer);
        }
    },
    getClaimedOffer: function() {
        return JSON.parse(localStorage.getItem("claimedOffer"));
    },
    clearClaimedOffer: function() {
        localStorage.removeItem("claimedOffer");
    }
};

// --- Booking Module ---
const Booking = {
    packagePrices: {
        "Standard Package": 8500,
        "Premium Package": 12500,
        "Luxury Package": 18000,
        "Custom Package": 0,
    },
    discountRate: 0,
    isDiscountApplied: false,
    appliedOffer: null,

    init: function () {
        this.bindEvents();
        const claimed = Offer.getClaimedOffer();
        if (claimed) {
            this.appliedOffer = claimed;
            this.discountRate = claimed.discount / 100;
            this.isDiscountApplied = true;
        }
    },

    bindEvents: function () {
        const buttons = document.querySelectorAll(".book-now");
        buttons.forEach((button) => {
            button.addEventListener("click", (e) => {
                e.preventDefault();
                if (!Auth.isLoggedIn()) {
                    alert("Please login to book a trip.");
                    window.location.href = window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
                    return;
                }
                const user = Auth.getCurrentUser();
                const claimed = Offer.getClaimedOffer();
                if (claimed) {
                    this.appliedOffer = claimed;
                    this.discountRate = claimed.discount / 100;
                    this.isDiscountApplied = true;
                }
                const packageName = e.target.getAttribute("data-package");
                const packageSelect = document.getElementById("package");
                if (packageSelect) {
                    packageSelect.value = packageName;
                    this.updatePrice();
                }
                const nameInput = document.getElementById("name");
                const emailInput = document.getElementById("email");
                if (nameInput) nameInput.value = user ? user.name : "";
                if (emailInput) emailInput.value = user ? user.email : "";

                const bookingModalEl = document.getElementById("bookingModal");
                if (bookingModalEl) {
                    const bookingModal = new bootstrap.Modal(bookingModalEl);
                    bookingModal.show();
                }
            });
        });

        const packageSelect = document.getElementById("package");
        const travelersInput = document.getElementById("travelers");
        if (packageSelect) packageSelect.addEventListener("change", () => this.updatePrice());
        if (travelersInput) travelersInput.addEventListener("input", () => this.updatePrice());

        const bookingForm = document.getElementById("bookingForm");
        if (bookingForm) {
            bookingForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const packageSelect = document.getElementById("package");
                const travelersInput = document.getElementById("travelers");
                const totalSpan = document.getElementById("totalAmount");
                const nameInput = document.getElementById("name");
                const emailInput = document.getElementById("email");

                const bookingData = {
                    name: nameInput.value,
                    email: emailInput.value,
                    package: packageSelect.value,
                    travelers: travelersInput.value,
                    total: totalSpan.textContent,
                    baseTotal: (this.packagePrices[packageSelect.value] || 0) * (parseInt(travelersInput.value) || 0),
                    date: new Date().toISOString(),
                    status: 'Pending Payment',
                    userEmail: emailInput.value,
                    appliedOffer: this.appliedOffer
                };

                const user = Auth.getCurrentUser();
                if (user) bookingData.userEmail = user.email;

                localStorage.setItem("pendingBooking", JSON.stringify(bookingData));
                const bookingModal = bootstrap.Modal.getInstance(document.getElementById("bookingModal"));
                if (bookingModal) bookingModal.hide();

                const isPagesDir = window.location.pathname.includes('/pages/');
                window.location.href = isPagesDir ? 'payment.html' : 'pages/payment.html';
            });
        }
    },

    updatePrice: function () {
        const packageSelect = document.getElementById("package");
        const travelersInput = document.getElementById("travelers");
        const packagePriceDiv = document.getElementById("packagePrice");
        const totalAmountSpan = document.getElementById("totalAmount");
        const originalTotalAmountSpan = document.getElementById("originalTotalAmount");
        const offerBadge = document.getElementById("offerBadge");

        if (!packageSelect || !travelersInput) return;

        const selectedPackage = packageSelect.value;
        const numTravelers = parseInt(travelersInput.value) || 0;
        const pricePerPerson = this.packagePrices[selectedPackage] || 0;
        if (packagePriceDiv) packagePriceDiv.textContent = "₹" + pricePerPerson.toLocaleString();

        let total = pricePerPerson * numTravelers;

        if (this.isDiscountApplied && this.appliedOffer) {
            const discountedTotal = total * (1 - this.discountRate);
            if (originalTotalAmountSpan) {
                originalTotalAmountSpan.textContent = "₹" + total.toLocaleString();
                originalTotalAmountSpan.classList.remove("d-none");
            }
            if (totalAmountSpan) totalAmountSpan.textContent = "₹" + Math.round(discountedTotal).toLocaleString();
            if (offerBadge) {
                offerBadge.textContent = `${this.appliedOffer.name} Applied (${this.appliedOffer.discount}%)`;
                offerBadge.classList.remove("d-none");
            }
        } else {
            if (originalTotalAmountSpan) originalTotalAmountSpan.classList.add("d-none");
            if (totalAmountSpan) totalAmountSpan.textContent = "₹" + total.toLocaleString();
            if (offerBadge) offerBadge.classList.add("d-none");
        }
    },
};

// --- Payment Module ---
const Payment = {
    init: function() {
        if(!document.getElementById('card-tab')) return;
        this.loadOrderSummary();
        this.bindEvents();
    },

    loadOrderSummary: function() {
        const pendingBooking = JSON.parse(localStorage.getItem('pendingBooking'));
        if(!pendingBooking) {
            alert("No pending booking found. Redirecting to home.");
            window.location.href = "../index.html";
            return;
        }
        document.getElementById('summaryPackage').textContent = pendingBooking.package;
        document.getElementById('summaryTravelers').textContent = `${pendingBooking.travelers} Persons`;
        this.updatePaymentSummary(pendingBooking);
        
        const amount = pendingBooking.total.replace(/[^0-9.]/g, '');
        const upiId = '7038948696';
        const upiName = 'MaharajaTravels';
        const upiData = `upi://pay?pa=${upiId}@upi&pn=${upiName}&am=${amount}&cu=INR`;
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiData)}`;
        const qrImg = document.getElementById('upiQrCode');
        if(qrImg) qrImg.src = qrApiUrl;
    },

    updatePaymentSummary: function(booking) {
        const baseAmountEl = document.getElementById('baseAmount');
        const offerRow = document.getElementById('offerRow');
        const appliedOfferName = document.getElementById('appliedOfferName');
        const discountAmountEl = document.getElementById('discountAmount');
        const summaryTotalEl = document.getElementById('summaryTotal');

        const baseAmount = booking.baseTotal || 0;
        let total = baseAmount;
        if (baseAmountEl) baseAmountEl.textContent = "₹" + baseAmount.toLocaleString();

        if (booking.appliedOffer) {
            const discount = Math.round(baseAmount * (booking.appliedOffer.discount / 100));
            total = baseAmount - discount;
            if (offerRow) offerRow.classList.remove('d-none');
            if (appliedOfferName) appliedOfferName.textContent = booking.appliedOffer.name;
            if (discountAmountEl) discountAmountEl.textContent = "-₹" + discount.toLocaleString();
            document.querySelectorAll('.offer-item').forEach(item => {
                if(item.getAttribute('data-offer-id') === booking.appliedOffer.id) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        } else {
            if (offerRow) offerRow.classList.add('d-none');
            document.querySelectorAll('.offer-item').forEach(item => item.classList.remove('active'));
        }
        if (summaryTotalEl) summaryTotalEl.textContent = "₹" + Math.round(total).toLocaleString();
        booking.total = "₹" + Math.round(total).toLocaleString();
        localStorage.setItem('pendingBooking', JSON.stringify(booking));
    },

    bindEvents: function() {
        const paymentForm = document.getElementById("paymentForm");
        const upiForm = document.getElementById("upiForm");
        if(paymentForm) {
            paymentForm.addEventListener("submit", (e) => {
                e.preventDefault();
                this.processPayment("Card");
            });
        }
        if(upiForm) {
            upiForm.addEventListener("submit", (e) => {
                e.preventDefault();
                this.processPayment("UPI");
            });
        }

        const offerItems = document.querySelectorAll('.offer-item');
        offerItems.forEach(item => {
            item.addEventListener('click', () => {
                const pendingBooking = JSON.parse(localStorage.getItem('pendingBooking'));
                const offerId = item.getAttribute('data-offer-id');
                const discount = parseInt(item.getAttribute('data-discount'));
                const name = item.querySelector('h6').textContent;
                if (pendingBooking.appliedOffer && pendingBooking.appliedOffer.id === offerId) {
                    delete pendingBooking.appliedOffer;
                } else {
                    pendingBooking.appliedOffer = { id: offerId, discount, name };
                }
                this.updatePaymentSummary(pendingBooking);
            });
        });

        ['cardNumber', 'cvv', 'upiId'].forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.addEventListener('input', (e) => {
                    e.target.value = e.target.value.replace(/\D/g, '');
                });
            }
        });
    },

    processPayment: function(method) {
        const submitBtn = method === "Card" ? document.getElementById('cardPayBtn') : document.getElementById('upiPayBtn');
        if (!submitBtn) return;
        submitBtn.disabled = true;
        submitBtn.textContent = "Processing...";

        setTimeout(() => {
            const pendingBooking = JSON.parse(localStorage.getItem('pendingBooking'));
            if(pendingBooking) {
                pendingBooking.status = 'Confirmed';
                pendingBooking.paymentId = 'TXN' + Date.now();
                pendingBooking.method = method;
                pendingBooking.date = new Date().toLocaleDateString();
                Database.Bookings.add(pendingBooking);
                localStorage.removeItem('pendingBooking');
                Offer.clearClaimedOffer();
            }
            alert(`Payment Successful! Your journey with Maharaja Travels begins now.`);
            window.location.href = "../index.html";
        }, 2000);
    }
};

// --- Update DOMContentLoaded ---
document.addEventListener("DOMContentLoaded", () => {
    try { 
        Database.init(); 
        DB.init().then(() => {
            try { Auth.init(); } catch (e) {}
            try { Offer.init(); } catch (e) {}
            try { Search.init(); } catch (e) {}
            try { Booking.init(); } catch (e) {}
            try { Payment.init(); } catch (e) {}
            try { Profile.init(); } catch (e) {}
            try { UI.init(); } catch (e) {}
            
            const forms = document.querySelectorAll("form:not(#bookingForm):not(#paymentForm):not(#upiForm):not(#loginPageForm):not(#registerPageForm)");
            forms.forEach(form => {
                form.addEventListener("submit", (e) => {
                    e.preventDefault();
                    alert("Message Sent! We will get back to you soon.");
                    form.reset();
                });
            });
        });
    } catch (e) { console.error("Initialization Failed:", e); }
});

// --- UI Utility Module ---
const UI = {
    init: function() {
        const yearSpan = document.getElementById("year");
        if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    }
};
