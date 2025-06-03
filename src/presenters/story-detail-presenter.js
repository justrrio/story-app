class StoryDetailPresenter {
  constructor({ view, model }) {
    this.view = view;
    this.model = model;
    this.currentStoryId = null;
    this.favoriteToggleHandler = null;
    this.onlineHandler = null;

    // Bind event listeners
    this._bindEvents();
  }

  _bindEvents() {
    // Remove existing listeners if any
    this._removeEventListeners();

    // Create bound handlers to maintain context
    this.favoriteToggleHandler = this._handleFavoriteToggle.bind(this);
    this.onlineHandler = this._syncPendingActions.bind(this);

    // Listen for favorite toggle events
    document.addEventListener("favorite:toggle", this.favoriteToggleHandler);

    // Listen for online status changes
    window.addEventListener("online", this.onlineHandler);
  }

  _removeEventListeners() {
    if (this.favoriteToggleHandler) {
      document.removeEventListener(
        "favorite:toggle",
        this.favoriteToggleHandler
      );
    }
    if (this.onlineHandler) {
      window.removeEventListener("online", this.onlineHandler);
    }
  }

  destroy() {
    // Clean up event listeners when presenter is destroyed
    this._removeEventListeners();
    this.favoriteToggleHandler = null;
    this.onlineHandler = null;
  }
  async init(id) {
    // Show loading state
    this.view.render(null, true);
    this.currentStoryId = id;

    try {
      // Fetch story details - now works for both authenticated users and guests
      const result = await this.model.getStoryDetail(id);
      this.view.render(result, false);

      // Update favorite button state
      if (result && result.story) {
        if (this.model.isLoggedIn()) {
          await this._updateFavoriteButtonState(result.story.id);
        } else {
          // For guest users, initialize favorite button as inactive
          // Guest users can still use favorites, they just get saved locally
          this.view.updateFavoriteButton(result.story.id, false);
        }
      }
    } catch (error) {
      console.error("Error fetching story details:", error);
      this.view.render({ error: true, message: error.message }, false);
    }
  }
  async _updateFavoriteButtonState(storyId) {
    try {
      // Add timeout protection
      const isFavoritePromise = this.model.isFavorite(storyId);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Favorite status check timed out")),
          3000
        );
      });

      // Use Promise.race to prevent hanging
      const isFavorite = await Promise.race([
        isFavoritePromise,
        timeoutPromise,
      ]).catch((error) => {
        console.error("Favorite status check failed:", error);
        return false; // Default to not favorite on error
      });

      this.view.updateFavoriteButton(storyId, isFavorite);
    } catch (error) {
      console.error("Error checking favorite status:", error);
      // Ensure button is reset even on error
      this.view.updateFavoriteButton(storyId, false);
    }
  }
  async _handleFavoriteToggle(event) {
    const { storyId, storyData } = event.detail;

    if (storyId !== this.currentStoryId) return;

    let originalState = false;

    try {
      // Store original favorite state with timeout protection
      const isFavoritePromise = this.model.isFavorite(storyId);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Favorite status check timed out")),
          3000
        );
      });

      // Use Promise.race to prevent hanging
      originalState = await Promise.race([
        isFavoritePromise,
        timeoutPromise,
      ]).catch((error) => {
        console.error("Favorite status check failed:", error);
        return false; // Default to not favorite on error
      });

      if (navigator.onLine) {
        // Online: Perform action immediately
        let success = false;

        if (originalState) {
          // Remove from favorites
          const result = await this.model.removeFavorite(storyId);
          success = result && result.success;

          if (success) {
            this._showToast("Removed from favorites", "success");
          } else {
            this._showToast("Failed to remove from favorites", "error");
          }
        } else {
          // Add to favorites
          const result = await this.model.addFavorite(storyData);
          success = result && result.success;

          if (success) {
            this._showToast("Added to favorites", "success");
          } else {
            this._showToast("Failed to add to favorites", "error");
          }
        }

        // Update button state - if failed, reset to original state
        if (success) {
          this.view.updateFavoriteButton(storyId, !originalState);
        } else {
          this.view.updateFavoriteButton(storyId, originalState);
        }
      } else {
        // Offline: Queue action
        await this._queueOfflineAction(
          originalState ? "remove" : "add",
          storyId,
          storyData
        );
        this._showToast("Action queued for when you're back online", "info");

        // Update UI optimistically
        this.view.updateFavoriteButton(storyId, !originalState);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      this._showToast("Failed to update favorite", "error");

      // Always ensure button is reset to a valid state, even if we don't know the original state
      this.view.updateFavoriteButton(storyId, originalState);
    } finally {
      // Make sure button is always reset from loading state
      if (!this.view.updateFavoriteButton) {
        const btn = document.querySelector(
          `[data-story-id="${storyId}"].favorite-btn`
        );
        if (btn) {
          btn.classList.remove("loading");
          btn.disabled = false;
        }
      }
    }
  }

  async _queueOfflineAction(action, storyId, storyData = null) {
    const pendingActions = JSON.parse(
      localStorage.getItem("pending_favorite_actions") || "[]"
    );

    // Remove any existing actions for this story to avoid conflicts
    const filteredActions = pendingActions.filter((a) => a.storyId !== storyId);

    // Add new action
    filteredActions.push({
      action,
      storyId,
      storyData,
      timestamp: Date.now(),
    });

    localStorage.setItem(
      "pending_favorite_actions",
      JSON.stringify(filteredActions)
    );
  }

  async _syncPendingActions() {
    try {
      const pendingActions = JSON.parse(
        localStorage.getItem("pending_favorite_actions") || "[]"
      );

      if (pendingActions.length === 0) return;

      console.log("Syncing pending favorite actions:", pendingActions.length);

      for (const action of pendingActions) {
        try {
          if (action.action === "add" && action.storyData) {
            await this.model.addFavorite(action.storyData);
          } else if (action.action === "remove") {
            await this.model.removeFavorite(action.storyId);
          }
        } catch (error) {
          console.error("Error syncing action:", action, error);
        }
      }

      // Clear synced actions
      localStorage.removeItem("pending_favorite_actions");

      // Update current story's favorite state if still viewing it
      if (this.currentStoryId) {
        await this._updateFavoriteButtonState(this.currentStoryId);
      }

      this._showToast("Favorites synced successfully", "success");
    } catch (error) {
      console.error("Error syncing pending actions:", error);
    }
  }

  _showToast(message, type = "info") {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll(".toast");
    existingToasts.forEach((toast) => toast.remove());

    // Create new toast
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${message}</span>
      <button class="toast-close">&times;</button>
    `;

    // Add to page
    document.body.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 3000);

    // Add click to close
    const closeBtn = toast.querySelector(".toast-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => toast.remove());
    }
  }
}

export default StoryDetailPresenter;
