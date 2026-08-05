(function () {
  // ==========================================
  // SUPABASE CONFIGURATION
  // ==========================================
  // The values are loaded from src/supabaseClient.js.
  // If that file cannot load, the site falls back to saving everything locally.
  const SUPABASE_CONFIG = {
    url: "",
    anonKey: ""
  };

  let supabaseClient = null;

  function loadSupabaseConfig(callback) {
    if (window.FawnKidsSupabaseConfig) {
      callback(window.FawnKidsSupabaseConfig);
      return;
    }

    const configScript = document.createElement("script");
    configScript.src = "src/supabaseClient.js";
    configScript.onload = function () {
      callback(window.FawnKidsSupabaseConfig || null);
    };
    configScript.onerror = function () {
      console.warn("Supabase configuration file could not be loaded. Using local storage fallback.");
      callback(null);
    };
    document.head.appendChild(configScript);
  }

  // Initialize Supabase Client dynamically
  function initSupabase(callback) {
    // Accept both old JWT (eyJ...) and new publishable (sb_publishable_...) key formats
    var hasValidKey = SUPABASE_CONFIG.anonKey &&
      (SUPABASE_CONFIG.anonKey.startsWith('eyJ') || SUPABASE_CONFIG.anonKey.startsWith('sb_publishable_'));
    if (!SUPABASE_CONFIG.url || !hasValidKey) {
      console.log("Supabase URL/Key not set or invalid. Fallback to LocalStorage is active.");
      if (callback) callback(null);
      return;
    }

    if (window.supabase) {
      supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      if (callback) callback(supabaseClient);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload = function () {
      if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        console.log("Supabase connected successfully!");
        if (callback) callback(supabaseClient);
      }
    };
    script.onerror = function () {
      console.warn("Failed to load Supabase SDK from CDN. Using LocalStorage fallback.");
      if (callback) callback(null);
    };
    document.head.appendChild(script);
  }

  const STORAGE_KEYS = {
    subscribers: "fawnKidsSubscribers",
    users: "fawnKidsUsers",
    admissions: "fawnKidsAdmissions",
    enrollments: "fawnKidsEnrollments",
    lastSignupEmail: "fawnKidsLastSignupEmail"
  };

  function readCollection(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.warn("Unable to read local storage collection", key, error);
      return [];
    }
  }

  function writeCollection(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function ensureToastRoot() {
    let root = document.getElementById("fk-toast-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "fk-toast-root";
      root.style.position = "fixed";
      root.style.top = "20px";
      root.style.right = "20px";
      root.style.zIndex = "4000";
      root.style.display = "flex";
      root.style.flexDirection = "column";
      root.style.gap = "10px";
      root.style.maxWidth = "320px";
      document.body.appendChild(root);
    }
    return root;
  }

  function showToast(message, type) {
    const root = ensureToastRoot();
    const toast = document.createElement("div");
    const accent = type === "error" ? "#B04A32" : "#2D6A4F";

    toast.textContent = message;
    toast.style.background = "rgba(255,255,255,0.96)";
    toast.style.border = "1px solid rgba(27,67,50,0.12)";
    toast.style.borderLeft = "4px solid " + accent;
    toast.style.boxShadow = "0 18px 40px rgba(17,17,17,0.12)";
    toast.style.borderRadius = "14px";
    toast.style.padding = "14px 16px";
    toast.style.fontFamily = "Inter, Arial, sans-serif";
    toast.style.fontSize = "0.95rem";
    toast.style.lineHeight = "1.5";
    toast.style.color = "#1A1A1A";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-8px)";
    toast.style.transition = "opacity 180ms ease, transform 180ms ease";

    root.appendChild(toast);

    requestAnimationFrame(function () {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    setTimeout(function () {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-8px)";
      setTimeout(function () {
        toast.remove();
      }, 220);
    }, 3200);
  }

  function attachNewsletterHandlers() {
    document.querySelectorAll(".newsletter-form-new").forEach(function (formLike) {
      const emailInput = formLike.querySelector('input[type="email"]');
      const button = formLike.querySelector(".btn-subscribe");

      if (!emailInput || !button) {
        return;
      }

      button.addEventListener("click", function () {
        const email = emailInput.value.trim().toLowerCase();

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          showToast("Enter a valid email address to subscribe.", "error");
          emailInput.focus();
          return;
        }

        const subscribers = readCollection(STORAGE_KEYS.subscribers);
        const exists = subscribers.some(function (entry) {
          return entry.email === email;
        });

        if (!exists) {
          const record = {
            email: email,
            page: window.location.pathname.split("/").pop() || "index.html",
            created_at: new Date().toISOString()
          };
          saveData("subscribers", STORAGE_KEYS.subscribers, record, function (success) {
            if (success) {
              emailInput.value = "";
              showToast("Thanks! Your email has been saved for school updates.", "success");
            } else {
              showToast("Subscription failed. Please try again.", "error");
            }
          });
        } else {
          emailInput.value = "";
          showToast("You are already subscribed!", "success");
        }
      });
    });
  }

  function attachSocialAuthHandlers() {
    const authPage = document.getElementById("loginForm") || document.getElementById("signupForm");
    if (!authPage) {
      return;
    }

    document.querySelectorAll(".btn-social").forEach(function (button) {
      button.addEventListener("click", function () {
        showToast("Social sign-in will be added soon. Please use the email form for now.", "success");
      });
    });
  }

  function prefillLoginEmail() {
    const emailInput = document.getElementById("email");
    const loginForm = document.getElementById("loginForm");
    if (!loginForm || !emailInput) {
      return;
    }

    const lastEmail = localStorage.getItem(STORAGE_KEYS.lastSignupEmail);
    if (lastEmail && !emailInput.value) {
      emailInput.value = lastEmail;
    }
  }

  function setupMobileNavigation() {
    const navbar = document.querySelector(".navbar");
    if (!navbar) {
      return;
    }

    const navInner = navbar.querySelector(".nav-inner");
    const navLinks = navbar.querySelector(".nav-links");
    const navActions = navbar.querySelector(".nav-actions");
    if (!navInner || !navLinks) {
      return;
    }

    // 1. Create hamburger button if it doesn't exist
    let hamburger = navInner.querySelector(".hamburger");
    if (!hamburger) {
      hamburger = document.createElement("button");
      hamburger.className = "hamburger";
      hamburger.setAttribute("aria-label", "Toggle Navigation Menu");
      hamburger.innerHTML = "<span></span><span></span><span></span>";
      navInner.appendChild(hamburger);
    }

    // 2. Clone actions for mobile layout if not already cloned
    let mobileActions = navLinks.querySelector(".mobile-actions");
    if (!mobileActions && navActions) {
      mobileActions = document.createElement("div");
      mobileActions.className = "mobile-actions";

      // Clone login & signup buttons
      const buttons = navActions.querySelectorAll("a");
      buttons.forEach(function (btn) {
        const clone = btn.cloneNode(true);
        mobileActions.appendChild(clone);
      });
      navLinks.appendChild(mobileActions);
    }

    // 3. Toggle navigation logic
    hamburger.addEventListener("click", function (e) {
      e.stopPropagation();
      hamburger.classList.toggle("active");
      navLinks.classList.toggle("open");
    });

    // Close dropdown on click outside
    document.addEventListener("click", function (e) {
      if (navLinks.classList.contains("open") && !navLinks.contains(e.target) && !hamburger.contains(e.target)) {
        hamburger.classList.remove("active");
        navLinks.classList.remove("open");
      }
    });
  }

  function attachToggleListener(btn) {
    btn.dataset.themeAttached = "true";
    let isAnimating = false;

    btn.addEventListener("click", function () {
      if (isAnimating) return;
      isAnimating = true;

      const curtain = document.getElementById("curtain-overlay");
      if (!curtain) {
        const isCurrentlyDark = document.documentElement.classList.contains("dark");
        if (isCurrentlyDark) {
          document.documentElement.classList.remove("dark");
          localStorage.setItem("theme", "light");
        } else {
          document.documentElement.classList.add("dark");
          localStorage.setItem("theme", "dark");
        }
        isAnimating = false;
        return;
      }

      const isCurrentlyDark = document.documentElement.classList.contains("dark");
      const nextTheme = isCurrentlyDark ? "light" : "dark";

      curtain.style.backgroundColor = nextTheme === "dark" ? "#0e0e0e" : "#FAF6F0";
      curtain.style.transformOrigin = "top";
      curtain.style.transform = "scaleY(1)";

      setTimeout(function () {
        if (nextTheme === "dark") {
          document.documentElement.classList.add("dark");
          localStorage.setItem("theme", "dark");
        } else {
          document.documentElement.classList.remove("dark");
          localStorage.setItem("theme", "light");
        }

        curtain.style.transformOrigin = "bottom";
        curtain.style.transform = "scaleY(0)";

        setTimeout(function () {
          curtain.style.transformOrigin = "top";
          isAnimating = false;
        }, 550);
      }, 550);
    });
  }

  function setupThemeToggle() {
    let toggleBtn = document.getElementById("theme-toggle-btn");
    let curtain = document.getElementById("curtain-overlay");

    if (toggleBtn) {
      if (!toggleBtn.dataset.themeAttached) {
        attachToggleListener(toggleBtn);
      }
      return;
    }

    if (!curtain) {
      curtain = document.createElement("div");
      curtain.id = "curtain-overlay";
      document.body.appendChild(curtain);
    }

    toggleBtn = document.createElement("button");
    toggleBtn.id = "theme-toggle-btn";
    toggleBtn.className = "floating-theme-toggle";
    toggleBtn.setAttribute("aria-label", "Toggle Dark Mode");
    toggleBtn.innerHTML = `
      <div class="icon-wrapper">
        <i class="fas fa-moon moon-icon"></i>
        <i class="fas fa-sun sun-icon"></i>
      </div>
    `;
    document.body.appendChild(toggleBtn);

    attachToggleListener(toggleBtn);
  }

  function saveData(table, localKey, record, callback) {
    // 1. Always save locally first as a backup/log
    const localData = readCollection(localKey);
    localData.push(record);
    writeCollection(localKey, localData);

    // 2. If Supabase is initialized, save to Supabase
    if (supabaseClient) {
      supabaseClient.from(table).insert([record]).then(function (result) {
        if (result.error) {
          console.error("Failed to sync to Supabase table '" + table + "':", result.error);
          if (callback) callback(false, result.error);
        } else {
          console.log("Successfully saved record to Supabase table '" + table + "'!");
          if (callback) callback(true);
        }
      });
    } else {
      // LocalStorage fallback only mode
      if (callback) callback(true);
    }
  }

  function sendEnquiryEmail(subject, fields) {
    const formData = new FormData();
    formData.append("_subject", subject);
    formData.append("_template", "table");
    formData.append("_captcha", "false");

    const replyTo = fields["Contact Email"] || fields["Email Address"];
    if (replyTo) {
      formData.append("_replyto", replyTo);
    }

    Object.keys(fields).forEach(function (label) {
      const value = fields[label];
      formData.append(label, value === undefined || value === null ? "" : String(value));
    });

    return fetch("https://formsubmit.co/ajax/fawnkidspreschool@gmail.com", {
      method: "POST",
      headers: { "Accept": "application/json" },
      body: formData
    }).then(function (response) {
      return response.json().then(function (result) {
        if (!response.ok || (result && (result.success === "false" || result.success === false))) {
          const msg = (result && result.message) || "FormSubmit email delivery request pending.";
          throw new Error(msg);
        }
        return result;
      });
    }).catch(function (error) {
      console.warn("FormSubmit fetch notice:", error);
      throw error;
    });
  }

  function getSupabaseClient() {
    return supabaseClient;
  }

  function signUpUser(name, email, password, callback) {
    const localUsers = readCollection(STORAGE_KEYS.users);
    const existsLocally = localUsers.some(function (user) { return user.email === email; });

    if (supabaseClient) {
      supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: { name: name }
        }
      }).then(function (result) {
        if (result.error) {
          console.error("Supabase Auth Sign Up error:", result.error);
          var errMsg = result.error.message || '';
          if (errMsg.toLowerCase().includes('already registered') || errMsg.toLowerCase().includes('user already exists')) {
            errMsg = 'That email is already registered. Please log in instead.';
          } else if (errMsg.toLowerCase().includes('password')) {
            errMsg = 'Password must be at least 6 characters long.';
          }
          if (callback) callback(false, errMsg);
        } else {
          // Check if Supabase returned a session (email confirm OFF) or just a user (confirm ON)
          const needsConfirm = result.data && result.data.user && !result.data.session;
          if (!existsLocally) {
            localUsers.push({ name: name, email: email, password: password, createdAt: new Date().toISOString() });
            writeCollection(STORAGE_KEYS.users, localUsers);
          }
          if (needsConfirm) {
            // Email confirmation is ON - tell user to check inbox
            if (callback) callback(true, 'CHECK_EMAIL');
          } else {
            if (callback) callback(true);
          }
        }
      }).catch(function (error) {
        console.error("Supabase Auth Sign Up request failed:", error);
        if (callback) callback(false, "Unable to reach the account service. Please try again.");
      });
    } else {
      if (existsLocally) {
        if (callback) callback(false, "That email is already registered. Please log in instead.");
        return;
      }
      localUsers.push({ name: name, email: email, password: password, createdAt: new Date().toISOString() });
      writeCollection(STORAGE_KEYS.users, localUsers);
      if (callback) callback(true);
    }
  }

  function loginUser(email, password, callback) {
    if (supabaseClient) {
      supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      }).then(function (result) {
        if (result.error) {
          console.error("Supabase Auth Log In error:", result.error);
          var errMsg = result.error.message || '';
          // User-friendly error messages in English
          if (errMsg.toLowerCase().includes('email not confirmed')) {
            errMsg = 'Your email is not yet confirmed. Please check your inbox and click the confirmation link, then try again.';
          } else if (errMsg.toLowerCase().includes('invalid login credentials') || errMsg.toLowerCase().includes('invalid email or password')) {
            errMsg = 'Incorrect email or password. Please try again or sign up.';
          } else if (errMsg.toLowerCase().includes('too many requests')) {
            errMsg = 'Too many login attempts. Please wait a moment and try again.';
          }
          if (callback) callback(false, errMsg);
        } else {
          const user = result.data.user;
          const sessionUser = {
            name: (user.user_metadata && user.user_metadata.name) || user.email.split('@')[0],
            email: user.email,
            loggedInAt: new Date().toISOString()
          };
          localStorage.setItem('fawnKidsCurrentUser', JSON.stringify(sessionUser));
          if (callback) callback(true, null, sessionUser);
        }
      }).catch(function (error) {
        console.error("Supabase Auth Log In request failed:", error);
        if (callback) callback(false, "Unable to reach the account service. Please try again.");
      });
    } else {
      const localUsers = readCollection(STORAGE_KEYS.users);
      const matchingUser = localUsers.find(function (user) { return user.email === email && user.password === password; });
      if (!matchingUser) {
        if (callback) callback(false, "Incorrect email or password. Please try again or sign up.");
        return;
      }
      const sessionUser = {
        name: matchingUser.name,
        email: matchingUser.email,
        loggedInAt: new Date().toISOString()
      };
      localStorage.setItem('fawnKidsCurrentUser', JSON.stringify(sessionUser));
      if (callback) callback(true, null, sessionUser);
    }
  }

  window.FawnKidsSite = {
    keys: STORAGE_KEYS,
    readCollection: readCollection,
    writeCollection: writeCollection,
    showToast: showToast,
    saveData: saveData,
    sendEnquiryEmail: sendEnquiryEmail,
    getSupabaseClient: getSupabaseClient,
    signUp: signUpUser,
    login: loginUser
  };

  document.addEventListener("DOMContentLoaded", function () {
    loadSupabaseConfig(function (config) {
      if (config && config.url && config.anonKey) {
        SUPABASE_CONFIG.url = config.url;
        SUPABASE_CONFIG.anonKey = config.anonKey;
      }

      initSupabase(function (client) {
        // Call handlers after Supabase init check
        attachNewsletterHandlers();
        attachSocialAuthHandlers();
        prefillLoginEmail();
        setupMobileNavigation();
        setupThemeToggle();
      });
    });
  });
})();
