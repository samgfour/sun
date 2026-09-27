<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  // Replace these only if you move to a different Supabase project.
  const SUPABASE_URL = "https://skgojmzodtcmfbahoxse.supabase.co";
  const SUPABASE_ANON_KEY =
    "sb_publishable_k8i3wMvLW0lffKo88ZJmAPWGGZCMP";

  const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  const STEPS = ["paid", "reviewing", "available", "withdrawn"];
  const STEP_LABELS = {
    paid: "Paid",
    reviewing: "Reviewing",
    available: "Available",
    withdrawn: "Withdrawn"
  };

  const FX_RATE = 129.4;
  const FEE_PCT = 0.02;
  const FEE_FLAT = 0.3;

  let currentUser = null;
  let requests = [];

  function fmt(n) {
    return Number(n).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function fmtKES(n) {
    return `KSh ${Number(n).toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  function switchTab(name) {
    document.querySelectorAll(".tab-btn").forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === name);
    });

    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `tab-${name}`);
    });
  }

  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  const authForm = document.getElementById("authForm");
  const authToggle = document.getElementById("authToggle");
  const authSubmit = document.getElementById("authSubmit");
  const authError = document.getElementById("authError");

  function showAuthError(message) {
    authError.textContent = message;
    authError.style.display = "block";
  }

  function hideAuthError() {
    authError.textContent = "";
    authError.style.display = "none";
  }

  function setAuthLoading(isLoading) {
    const mode = authForm.dataset.mode;

    authSubmit.disabled = isLoading;

    if (isLoading) {
      authSubmit.textContent =
        mode === "signup" ? "Creating account…" : "Signing in…";
      return;
    }

    authSubmit.textContent =
      mode === "signup" ? "Create account" : "Sign in";
  }

  function isSupabaseConfigured() {
    return (
      SUPABASE_URL &&
      SUPABASE_ANON_KEY &&
      !SUPABASE_URL.includes("YOUR_SUPABASE") &&
      !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE")
    );
  }

  if (!isSupabaseConfigured()) {
    showAuthError(
      "Supabase is not configured. Add your project URL and publishable key."
    );
    authSubmit.disabled = true;
  }

  authToggle.addEventListener("click", () => {
    const signingUp = authForm.dataset.mode === "signup";

    authForm.dataset.mode = signingUp ? "signin" : "signup";
    authSubmit.textContent = signingUp ? "Sign in" : "Create account";
    authToggle.textContent = signingUp
      ? "Need an account? Sign up"
      : "Have an account? Sign in";

    hideAuthError();
  });

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isSupabaseConfigured()) {
      showAuthError(
        "Supabase is not configured. Add your project URL and publishable key."
      );
      return;
    }

    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const mode = authForm.dataset.mode;

    hideAuthError();
    setAuthLoading(true);

    try {
      let result;

      if (mode === "signup") {
        result = await supabase.auth.signUp({
          email,
          password
        });
      } else {
        result = await supabase.auth.signInWithPassword({
          email,
          password
        });
      }

      if (result.error) {
        throw result.error;
      }

      /*
        When Supabase email confirmation is enabled, signUp creates the user
        but intentionally returns no active session. The user must confirm
        their email before signing in.
      */
      if (mode === "signup" && !result.data.session) {
        showAuthError(
          "Account created. Check your email to confirm your account, then sign in."
        );
        setAuthLoading(false);
        return;
      }

      const user = result.data.session?.user || result.data.user;

      if (!user) {
        throw new Error(
          "Your account was created, but no active session was returned. Please sign in."
        );
      }

      await onAuthed(user);
    } catch (error) {
      showAuthError(error?.message || "Something went wrong. Please try again.");
      setAuthLoading(false);
    }
  });

  document.getElementById("signOut").addEventListener("click", async () => {
    await supabase.auth.signOut();

    currentUser = null;
    requests = [];

    document.getElementById("authGate").classList.remove("hidden");
    document.getElementById("appShell").classList.add("hidden");

    authForm.reset();
    authForm.dataset.mode = "signin";
    authSubmit.textContent = "Sign in";
    authToggle.textContent = "Need an account? Sign up";
    hideAuthError();
  });

  async function onAuthed(user) {
    currentUser = user;

    document.getElementById("authGate").classList.add("hidden");
    document.getElementById("appShell").classList.remove("hidden");

    await loadRequests();
    switchTab("dashboard");
  }

  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error("Could not restore the session:", error);
      return;
    }

    if (data.session?.user) {
      onAuthed(data.session.user);
    }
  });

  /*
    Keep your existing loadRequests(), request form, renderDashboard(),
    renderStatusList(), advance(), and related functions below this point.
  */
</script>