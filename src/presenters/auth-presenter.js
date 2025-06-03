class AuthPresenter {
  constructor({ view, model }) {
    this.view = view;
    this.model = model;
    this._initListener();
  }
  renderLogin() {
    this.view.renderLogin();
    return document.getElementById("login-form") !== null;
  }

  renderRegister() {
    this.view.renderRegister();
    return document.getElementById("register-form") !== null;
  }

  ensureFormRendered(formType) {
    if (formType === "login" && !document.getElementById("login-form")) {
      return this.renderLogin();
    } else if (
      formType === "register" &&
      !document.getElementById("register-form")
    ) {
      return this.renderRegister();
    }
    return true;
  }
  _initListener() {
    document.addEventListener("auth:login", async (event) => {
      try {
        const { email, password } = event.detail;

        // Quick validation before API call
        if (!email || !password) {
          this.view.showAuthResult(
            { error: true, message: "Email and password are required" },
            "login"
          );
          return;
        }

        // Make API call immediately without delays
        const result = await this.model.login(email, password);

        // Show result immediately
        this.view.showAuthResult(result, "login");

        if (!result.error) {
          // Update UI immediately
          this._updateNavbar();

          // Dispatch user logged in event immediately
          document.dispatchEvent(new CustomEvent("user:loggedIn"));
        }
      } catch (error) {
        console.error("Login error:", error);

        // Show error result immediately
        this.view.showAuthResult(
          {
            error: true,
            message: error.message || "Login failed. Please try again.",
          },
          "login"
        );
      }
    });

    document.addEventListener("auth:register", async (event) => {
      try {
        const { name, email, password } = event.detail;

        // Quick validation before API call
        if (!name || !email || !password) {
          this.view.showAuthResult(
            { error: true, message: "All fields are required" },
            "register"
          );
          return;
        }

        if (password.length < 8) {
          this.view.showAuthResult(
            {
              error: true,
              message: "Password must be at least 8 characters long",
            },
            "register"
          );
          return;
        }

        // Make API call immediately without delays
        const result = await this.model.register(name, email, password);

        // Show result immediately
        this.view.showAuthResult(result, "register");

        // No additional processing needed for successful registration
        // Redirect will be handled by showAuthResult method
      } catch (error) {
        console.error("Registration error:", error);

        // Show error result immediately
        this.view.showAuthResult(
          {
            error: true,
            message: error.message || "Registration failed. Please try again.",
          },
          "register"
        );
      }
    });
  }

  _updateNavbar() {
    const loginLink = document.getElementById("loginLink");

    if (this.model.isLoggedIn()) {
      const name = localStorage.getItem("name");
      loginLink.innerHTML = `<i class="fas fa-sign-out-alt"></i> Logout (${name})`;
      loginLink.href = "#/logout";
    } else {
      loginLink.innerHTML = `<i class="fas fa-sign-in-alt"></i> Login`;
      loginLink.href = "#/login";
    }
  }
}

export default AuthPresenter;
