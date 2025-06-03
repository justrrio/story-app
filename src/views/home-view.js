class HomeView {
  constructor() {
    this.app = document.getElementById("app-container");
  }
  render(stories = []) {
    this.app.innerHTML = `
      <section class="container">
        <h2><i class="fas fa-book-open"></i> Latest Stories</h2>
        ${
          stories.length === 0
            ? `<div class="loading"><div class="spinner"></div></div>`
            : `<div class="story-list">
              ${stories
                .map((story) => this._createStoryCardTemplate(story))
                .join("")}
            </div>`
        }
      </section>
    `;

    this._attachEventListeners();
  }
  _createStoryCardTemplate(story) {
    const isGuest = story.isGuest || story.id.startsWith("guest_");

    return `
      <article class="story-card" data-story-id="${story.id}">
        <div class="story-thumbnail">
          <img src="${story.photoUrl}" alt="Story by ${
      story.name
    }" loading="lazy">
          <button class="favorite-btn" data-story-id="${
            story.id
          }" title="Add to favorites">
            <i class="far fa-heart" id="heart-${story.id}"></i>
          </button>
          ${
            isGuest
              ? '<div class="guest-badge"><i class="fas fa-user"></i> Guest</div>'
              : ""
          }
        </div>
        <div class="story-info">
          <div class="story-header">
            <div class="author-info">
              <div class="author-avatar">
                <i class="fas fa-user-circle"></i>
              </div>
              <div class="author-details">
                <span class="author-name">${story.name}${
      isGuest ? " (Guest)" : ""
    }</span>
                <span class="upload-date">${this._formatDate(
                  story.createdAt
                )}</span>
              </div>
            </div>
          </div>
          <div class="story-content">
            <h3 class="story-title">${this._truncateDescription(
              story.description,
              60
            )}</h3>
            <p class="story-description">${this._truncateDescription(
              story.description,
              120
            )}</p>
          </div>
          <div class="story-actions">
            <a href="#/story/${story.id}" class="btn-detail">
              <i class="fas fa-eye"></i> View Details
            </a>
          </div>
        </div>
      </article>
    `;
  }

  _truncateDescription(description, maxLength = 100) {
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + "...";
  }

  _formatDate(dateString) {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString("en-US", options);
  }
  _attachEventListeners() {
    const storyList = document.querySelector(".story-list");
    if (storyList) {
      storyList.addEventListener("click", (e) => {
        if (e.target.closest(".favorite-btn")) {
          const btn = e.target.closest(".favorite-btn");
          const storyId = btn.dataset.storyId;
          this._handleFavoriteToggle(storyId, btn);
        }
      });
    }
  }
  _handleFavoriteToggle(storyId, btn) {
    // Prevent multiple clicks while processing
    if (btn.classList.contains("loading") || btn.disabled) {
      console.log("Favorite toggle already in progress, ignoring click");
      return;
    }

    // Get story data from the card
    const storyCard = btn.closest(".story-card");
    const storyData = this._extractStoryDataFromCard(storyCard);

    // Store original button content for reliable restoration
    const originalContent = btn.innerHTML;
    const icon = btn.querySelector("i");
    const originalClass = icon.className;

    // Disable button to prevent multiple clicks
    btn.disabled = true;

    // Dispatch custom event to presenter
    const event = new CustomEvent("favorite:toggle", {
      detail: { storyId, storyData },
    });
    document.dispatchEvent(event);

    // Provide immediate visual feedback
    btn.classList.add("loading");
    icon.className = "fas fa-spinner fa-spin";

    // Add timeout as failsafe to reset button state
    setTimeout(() => {
      if (btn.classList.contains("loading")) {
        console.warn("Favorite toggle taking too long, resetting button state");
        btn.classList.remove("loading");
        btn.disabled = false;
        // Use the stored original content instead of assuming a default state
        btn.innerHTML = originalContent;
      }
    }, 5000); // Reduced to 5-second timeout for better UX
  }

  _extractStoryDataFromCard(storyCard) {
    const storyId = storyCard.dataset.storyId;
    const img = storyCard.querySelector("img");
    const name = storyCard.querySelector("h3").textContent;
    const description = storyCard.querySelector("p").textContent;

    return {
      id: storyId,
      name: name,
      description: description,
      photoUrl: img.src,
    };
  }
  updateFavoriteButton(storyId, isFavorite) {
    const btn = document.querySelector(
      `[data-story-id="${storyId}"].favorite-btn`
    );
    const icon = document.getElementById(`heart-${storyId}`);

    if (btn && icon) {
      // Remove loading state and re-enable button
      btn.classList.remove("loading");
      btn.disabled = false;

      if (isFavorite) {
        icon.className = "fas fa-heart";
        btn.classList.add("favorited");
        btn.title = "Remove from favorites";
      } else {
        icon.className = "far fa-heart";
        btn.classList.remove("favorited");
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
}

export default HomeView;
