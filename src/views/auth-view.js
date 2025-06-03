class AuthView {
  constructor() {
    this.app = document.getElementById("app-container");
    this.isLoginInProgress = false;
    this.isRegisterInProgress = false;
  }

  renderLogin() {
    this.app.innerHTML = `
      <section class="container">
        <div class="form-container">
          <h2><i class="fas fa-sign-in-alt"></i> Login</h2>
          <form id="login-form">
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" class="form-control" required>
            </div>
            <button type="submit" class="btn btn-block">Login</button>
            <p class="text-center mt-3">
              Don't have an account? <a href="#/register">Register</a>
            </p>
          </form>
        </div>
      </section>
    `;

    this._attachLoginEventListeners();
  }

  renderRegister() {
    this.app.innerHTML = `
      <section class="container">
        <div class="form-container">
          <h2><i class="fas fa-user-plus"></i> Register</h2>
          <form id="register-form">
            <div class="form-group">
              <label for="name">Name</label>
              <input type="text" id="name" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="password">Password (min. 8 characters)</label>
              <input type="password" id="password" class="form-control" minlength="8" required>
            </div>
            <button type="submit" class="btn btn-block">Register</button>
            <p class="text-center mt-3">
              Already have an account? <a href="#/login">Login</a>
            </p>
          </form>
        </div>
      </section>
    `;

    this._attachRegisterEventListeners();
  }
  _attachLoginEventListeners() {
    const form = document.getElementById("login-form");
    if (!form) {
      console.error(
        "Login form not found when trying to attach event listeners"
      );
      return;
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const emailInput = document.getElementById("email");
      const passwordInput = document.getElementById("password");
      const submitButton = form.querySelector('button[type="submit"]'); // Prevent double submit - check multiple conditions
      if (
        this.isLoginInProgress ||
        submitButton?.disabled ||
        submitButton?.classList.contains("loading")
      ) {
        console.log("Login already in progress, ignoring double click");
        return;
      }

      if (!emailInput || !passwordInput) {
        console.error("Login form inputs not found");
        return;
      }

      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();

      // Basic validation
      if (!email || !password) {
        this.showValidationError("Please fill in all fields");
        return;
      }

      // Set progress flag and loading state immediately
      this.isLoginInProgress = true;
      this.setLoginLoading(true);

      // Dispatch custom event for login
      const event = new CustomEvent("auth:login", {
        detail: { email, password },
      });
      document.dispatchEvent(event);
    });

    // Add click listener to button for extra protection
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.addEventListener("click", (e) => {
        if (
          submitButton.disabled ||
          submitButton.classList.contains("loading")
        ) {
          e.preventDefault();
          e.stopPropagation();
          console.log("Button click prevented - already loading");
          return false;
        }
      });
    }
  }
  _attachRegisterEventListeners() {
    const form = document.getElementById("register-form");
    if (!form) {
      console.error(
        "Register form not found when trying to attach event listeners"
      );
      return;
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const nameInput = document.getElementById("name");
      const emailInput = document.getElementById("email");
      const passwordInput = document.getElementById("password");
      const submitButton = form.querySelector('button[type="submit"]'); // Prevent double submit - check multiple conditions
      if (
        this.isRegisterInProgress ||
        submitButton?.disabled ||
        submitButton?.classList.contains("loading")
      ) {
        console.log("Registration already in progress, ignoring double click");
        return;
      }

      if (!nameInput || !emailInput || !passwordInput) {
        console.error("Register form inputs not found");
        return;
      }

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();

      // Basic validation
      if (!name || !email || !password) {
        this.showValidationError("Please fill in all fields");
        return;
      }

      if (password.length < 8) {
        this.showValidationError("Password must be at least 8 characters long");
        return;
      }

      // Set progress flag and loading state immediately
      this.isRegisterInProgress = true;
      this.setRegisterLoading(true);

      // Dispatch custom event for registration
      const event = new CustomEvent("auth:register", {
        detail: { name, email, password },
      });
      document.dispatchEvent(event);
    });

    // Add click listener to button for extra protection
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.addEventListener("click", (e) => {
        if (
          submitButton.disabled ||
          submitButton.classList.contains("loading")
        ) {
          e.preventDefault();
          e.stopPropagation();
          console.log("Button click prevented - already loading");
          return false;
        }
      });
    }
  }
  showAuthResult(result, type) {
    // Reset loading state and progress flags first
    if (type === "login") {
      this.isLoginInProgress = false;
      this.setLoginLoading(false);
    } else if (type === "register") {
      this.isRegisterInProgress = false;
      this.setRegisterLoading(false);
    }

    const form = document.getElementById(`${type}-form`);

    // Check if form exists
    if (!form) {
      console.error(`Form with id "${type}-form" not found.`);
      return;
    }

    // Remove any existing alerts
    const existingAlert = form.querySelector(".alert");
    if (existingAlert) {
      existingAlert.remove();
    }

    if (!result.error) {
      form.insertAdjacentHTML(
        "afterbegin",
        `
        <div class="alert alert-success">
          <p><i class="fas fa-check-circle"></i> ${
            result.message ||
            (type === "login"
              ? "Login successful!"
              : "Registration successful!")
          }</p>
        </div>
      `
      );
      if (type === "login") {
        // Trigger notification initialization event immediately
        document.dispatchEvent(new CustomEvent("user:loggedIn"));

        // Redirect to home immediately after successful login
        setTimeout(() => {
          window.location.hash = "#/";
        }, 200); // Reduced from 500ms to 200ms
      } else if (type === "register") {
        // Redirect to login immediately after successful registration
        setTimeout(() => {
          window.location.hash = "#/login";
        }, 200); // Reduced from 500ms to 200ms
      }
    } else {
      form.insertAdjacentHTML(
        "afterbegin",
        `
        <div class="alert alert-danger">
          <p><i class="fas fa-exclamation-circle"></i> ${result.message}</p>
        </div>
      `
      );
    }
  }
  // Loading state management
  setLoginLoading(isLoading) {
    const form = document.getElementById("login-form");
    const submitButton = form?.querySelector('button[type="submit"]');
    const emailInput = form?.querySelector("#email");
    const passwordInput = form?.querySelector("#password");

    if (submitButton) {
      if (isLoading) {
        // Disable button immediately and add multiple protections
        submitButton.disabled = true;
        submitButton.classList.add("loading");
        submitButton.style.pointerEvents = "none"; // Extra protection
        submitButton.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Logging in...';

        // Remove any existing click listeners temporarily
        submitButton.setAttribute(
          "data-original-onclick",
          submitButton.onclick
        );
        submitButton.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        };
      } else {
        submitButton.disabled = false;
        submitButton.classList.remove("loading");
        submitButton.style.pointerEvents = "auto";
        submitButton.innerHTML = "Login";

        // Restore original onclick if it existed
        const originalOnclick = submitButton.getAttribute(
          "data-original-onclick"
        );
        if (originalOnclick && originalOnclick !== "null") {
          submitButton.onclick = originalOnclick;
        } else {
          submitButton.onclick = null;
        }
        submitButton.removeAttribute("data-original-onclick");
      }
    }

    // Disable form inputs during loading
    if (emailInput) emailInput.disabled = isLoading;
    if (passwordInput) passwordInput.disabled = isLoading;
  }

  setRegisterLoading(isLoading) {
    const form = document.getElementById("register-form");
    const submitButton = form?.querySelector('button[type="submit"]');
    const nameInput = form?.querySelector("#name");
    const emailInput = form?.querySelector("#email");
    const passwordInput = form?.querySelector("#password");

    if (submitButton) {
      if (isLoading) {
        // Disable button immediately and add multiple protections
        submitButton.disabled = true;
        submitButton.classList.add("loading");
        submitButton.style.pointerEvents = "none"; // Extra protection
        submitButton.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Registering...';

        // Remove any existing click listeners temporarily
        submitButton.setAttribute(
          "data-original-onclick",
          submitButton.onclick
        );
        submitButton.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        };
      } else {
        submitButton.disabled = false;
        submitButton.classList.remove("loading");
        submitButton.style.pointerEvents = "auto";
        submitButton.innerHTML = "Register";

        // Restore original onclick if it existed
        const originalOnclick = submitButton.getAttribute(
          "data-original-onclick"
        );
        if (originalOnclick && originalOnclick !== "null") {
          submitButton.onclick = originalOnclick;
        } else {
          submitButton.onclick = null;
        }
        submitButton.removeAttribute("data-original-onclick");
      }
    }

    // Disable form inputs during loading
    if (nameInput) nameInput.disabled = isLoading;
    if (emailInput) emailInput.disabled = isLoading;
    if (passwordInput) passwordInput.disabled = isLoading;
  }

  showValidationError(message) {
    const form = document.querySelector("#login-form, #register-form");
    if (!form) return;

    // Remove existing alerts
    const existingAlert = form.querySelector(".alert");
    if (existingAlert) {
      existingAlert.remove();
    }

    // Add validation error
    form.insertAdjacentHTML(
      "afterbegin",
      `
      <div class="alert alert-danger">
        <p><i class="fas fa-exclamation-triangle"></i> ${message}</p>
      </div>
    `
    );

    // Auto remove after 5 seconds
    setTimeout(() => {
      const alert = form.querySelector(".alert-danger");
      if (alert) alert.remove();
    }, 5000);
  }
}

export default AuthView;
