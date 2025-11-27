document.addEventListener("DOMContentLoaded", () => {
  const activitiesListEl = document.getElementById("activities-list");
  const activitySelectEl = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageEl = document.getElementById("message");

  let activities = {};

  function showMessage(text, type = "info") {
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.classList.remove("hidden");
    setTimeout(() => {
      messageEl.classList.add("hidden");
    }, 4500);
  }

  function createParticipantItem(email, activityName) {
    const li = document.createElement("li");
    const initials = email.charAt(0).toUpperCase();
    const badge = document.createElement("span");
    badge.className = "participant-badge";
    badge.textContent = initials;
    li.appendChild(badge);
    const span = document.createElement("span");
    span.textContent = email;
    li.appendChild(span);

    // Remove button
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "participant-remove-button";
    btn.title = "Unregister";
    btn.setAttribute("aria-label", `Unregister ${email}`);
    btn.textContent = "🗑️";
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        const url = `/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`;
        const res = await fetch(url, { method: "DELETE" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Error al remover participante");
        }

        // Update local state
        if (activities[activityName]) {
          activities[activityName].participants = activities[activityName].participants.filter((p) => p !== email);
          const card = document.querySelector(`.activity-card[data-activity="${CSS.escape(activityName)}"]`);
          if (card) {
            const capacityP = card.querySelector("p:nth-of-type(3)");
            if (capacityP) {
              capacityP.innerHTML = `<strong>Capacidad:</strong> ${activities[activityName].participants.length} / ${activities[activityName].max_participants}`;
            }
          }
        }

        li.remove();
        showMessage(`Se ha eliminado ${email}`, "info");
      } catch (err) {
        console.error(err);
        showMessage(err.message || "No se pudo eliminar", "error");
      }
    });

    li.appendChild(btn);
    return li;
  }

  function renderActivities() {
    activitiesListEl.innerHTML = "";
    if (!activities || Object.keys(activities).length === 0) {
      activitiesListEl.innerHTML = "<p>No hay actividades disponibles.</p>";
      return;
    }

    Object.entries(activities).forEach(([name, info]) => {
      const card = document.createElement("div");
      card.className = "activity-card";
      card.setAttribute("data-activity", name);

      const title = document.createElement("h4");
      title.textContent = name;
      card.appendChild(title);

      const desc = document.createElement("p");
      desc.textContent = info.description;
      card.appendChild(desc);

      const schedule = document.createElement("p");
      schedule.innerHTML = `<strong>Horario:</strong> ${info.schedule}`;
      card.appendChild(schedule);

      const capacity = document.createElement("p");
      capacity.innerHTML = `<strong>Capacidad:</strong> ${info.participants.length} / ${info.max_participants}`;
      card.appendChild(capacity);

      // Participants section
      const participantsSection = document.createElement("div");
      participantsSection.className = "participants-section";

      const participantsTitle = document.createElement("h5");
      participantsTitle.textContent = "Participantes:";
      participantsSection.appendChild(participantsTitle);

      const ul = document.createElement("ul");
      ul.className = "participants-list";
      info.participants.forEach((email) => {
        ul.appendChild(createParticipantItem(email, name));
      });

      participantsSection.appendChild(ul);
      card.appendChild(participantsSection);

      activitiesListEl.appendChild(card);

      // Add option to select
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelectEl.appendChild(option);
    });
  }

  async function loadActivities() {
    activitiesListEl.innerHTML = "<p>Loading activities...</p>";
    try {
      const res = await fetch("/activities");
      if (!res.ok) throw new Error("Error cargando actividades");
      activities = await res.json();
      renderActivities();
    } catch (err) {
      activitiesListEl.innerHTML = `<p class="error">No se pudieron cargar las actividades.</p>`;
      console.error(err);
    }
  }

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const activityName = document.getElementById("activity").value;
    if (!email || !activityName) {
      showMessage("Completa correo y actividad.", "error");
      return;
    }

    try {
      const url = `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`;
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = err.detail || "Error al inscribirse";
        throw new Error(detail);
      }
      await res.json(); // contiene mensaje

      // Actualizar estado local y UI: agregar participante a la lista en la tarjeta
      if (activities[activityName]) {
        activities[activityName].participants.push(email);
        // update capacity text and participants list
        const card = document.querySelector(`.activity-card[data-activity="${CSS.escape(activityName)}"]`);
        if (card) {
          const capacityP = card.querySelector("p:nth-of-type(3)");
          if (capacityP) {
            capacityP.innerHTML = `<strong>Capacidad:</strong> ${activities[activityName].participants.length} / ${activities[activityName].max_participants}`;
          }
          const ul = card.querySelector(".participants-list");
          if (ul) {
            ul.appendChild(createParticipantItem(email, activityName));
          }
        }
      }

      showMessage(`Inscrito ${email} en "${activityName}"`, "success");
      signupForm.reset();
    } catch (err) {
      console.error(err);
      showMessage(err.message || "No se pudo inscribir", "error");
    }
  });

  loadActivities();
});
