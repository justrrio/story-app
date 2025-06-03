class StoryDetailView {
  constructor() {
    this.app = document.getElementById("app-container");
  }

  render(storyData = null, isLoading = true) {
    if (isLoading) {
      this.app.innerHTML = `
        <section class="container">
          <div class="loading"><div class="spinner"></div></div>
        </section>
      `;
      return;
    }

    if (!storyData || storyData.error) {
      this.app.innerHTML = `
        <section class="container">
          <div class="alert alert-danger">
            <p>Failed to load story. ${
              storyData?.message || "Please try again later."
            }</p>
          </div>
          <a href="#/" class="btn"><i class="fas fa-arrow-left"></i> Back to Home</a>
        </section>
      `;
      return;
    }
    const { story } = storyData;
    const hasLocation = story.lat !== null && story.lon !== null;
    const isGuest = story.isGuest || story.id.startsWith("guest_");

    this.app.innerHTML = `
      <section class="container">
        <div class="story-detail">
          <img src="${story.photoUrl}" alt="Photo by ${
      story.name
    }" class="story-detail-image">          <div class="story-detail-content">
            <div class="story-detail-header">
              <h2>${story.name}${
      isGuest ? ' <span class="guest-indicator">(Guest)</span>' : ""
    }</h2>
              <button class="favorite-btn btn-icon" data-story-id="${
                story.id
              }" title="Toggle favorite">
                <i class="far fa-heart" id="favorite-icon-${story.id}"></i>
              </button>
            </div>
            <p class="story-meta">
              <i class="far fa-clock"></i> ${this._formatDate(story.createdAt)}
              ${
                isGuest
                  ? '<span class="guest-badge-inline"><i class="fas fa-user"></i> Guest Story</span>'
                  : ""
              }
            </p>
            <p>${story.description}</p>
            ${
              hasLocation
                ? `
              <div class="map-container">
                <div id="mapid"></div>
              </div>
            `
                : ""
            }
          </div>
          <a href="#/" class="btn"><i class="fas fa-arrow-left"></i> Back to Home</a>
        </div>
      </section>
    `;
    if (hasLocation) {
      this._initializeMap(story.lat, story.lon, story.name);
    }

    // Set up favorite button event listener
    this._setupFavoriteButton(story);
  }
  _setupFavoriteButton(story) {
    const favoriteBtn = document.querySelector(`[data-story-id="${story.id}"]`);
    if (favoriteBtn) {
      favoriteBtn.addEventListener("click", (e) => {
        e.preventDefault();

        // Prevent multiple clicks while processing
        if (favoriteBtn.classList.contains("loading") || favoriteBtn.disabled) {
          console.log("Favorite toggle already in progress, ignoring click");
          return;
        }

        // Store button's original state
        const icon = favoriteBtn.querySelector("i");
        const originalClass = icon.className;
        const originalContent = favoriteBtn.innerHTML;

        // Add loading state and disable button
        favoriteBtn.classList.add("loading");
        favoriteBtn.disabled = true;
        icon.className = "fas fa-spinner fa-spin";

        const event = new CustomEvent("favorite:toggle", {
          detail: {
            storyId: story.id,
            storyData: story,
          },
        });
        document.dispatchEvent(event);

        // Add timeout as failsafe to reset button state
        setTimeout(() => {
          if (favoriteBtn.classList.contains("loading")) {
            console.warn(
              "Favorite toggle taking too long, resetting button state"
            );
            favoriteBtn.classList.remove("loading");
            favoriteBtn.disabled = false;
            // Use the stored original content instead of just the class
            favoriteBtn.innerHTML = originalContent;
          }
        }, 5000); // Reduced to 5-second timeout for better UX
      });
    }
  }
  updateFavoriteButton(storyId, isFavorite) {
    const icon = document.getElementById(`favorite-icon-${storyId}`);
    const btn = document.querySelector(`[data-story-id="${storyId}"]`);

    if (icon && btn) {
      // Remove loading state and re-enable button
      btn.classList.remove("loading");
      btn.disabled = false;

      if (isFavorite) {
        icon.className = "fas fa-heart";
        btn.classList.add("active");
        btn.title = "Remove from favorites";
      } else {
        icon.className = "far fa-heart";
        btn.classList.remove("active");
        btn.title = "Add to favorites";
      }
    }
  }

  showToast(message, type = "success") {
    // Create toast notification
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <i class="fas ${
          type === "success" ? "fa-check-circle" : "fa-exclamation-circle"
        }"></i>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(toast);

    // Show toast
    setTimeout(() => toast.classList.add("show"), 100);

    // Hide and remove toast
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }

  _formatDate(dateString) {
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("en-US", options);
  }

  _initializeMap(lat, lon, name) {
    setTimeout(() => {
      const map = L.map("mapid").setView([lat, lon], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      L.marker([lat, lon])
        .addTo(map)
        .bindPopup(`<b>${name}'s Story Location</b>`)
        .openPopup();
    }, 100);
  }
}

export default StoryDetailView;
