(function () {
  "use strict";

  var S = window.SPRINKLE;

  document.addEventListener("DOMContentLoaded", function () {
    S.injectHeader(function () {
      S.initHeader();

      if (S.hydrateIcons) S.hydrateIcons(document.body);
      initCreateForm();
    });
  });

  function initCreateForm() {
    var form = document.getElementById("create-form");
    if (!form) return;

    var nameEl = document.getElementById("ce-name");
    var devEl = document.getElementById("ce-developer");
    var descEl = document.getElementById("ce-description");
    var fileEl = document.getElementById("ce-file");
    var sourceEl = document.getElementById("ce-source");
    var dropZone = document.getElementById("ce-drop");
    var fileNameEl = document.getElementById("ce-file-name");
    var descCount = document.getElementById("ce-desc-count");
    var stateEl = document.getElementById("create-state");
    var submitBtn = document.getElementById("create-submit");
    var submitLabel = submitBtn.querySelector(".submit-label");

    var REQUIRED = ["name", "developer", "description", "file", "categories"];
    var MAX_DESC = parseInt(descEl.getAttribute("maxlength"), 10) || 280;

    var catWrap = document.getElementById("ce-categories");
    var CATEGORY_META = S.CATEGORY_META || {};
    if (catWrap) {
      Object.keys(CATEGORY_META).forEach(function (key) {
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "pick-chip";
        chip.setAttribute("data-category", key);
        chip.setAttribute("aria-pressed", "false");
        chip.textContent = CATEGORY_META[key].label;
        chip.addEventListener("click", function () {
          setPressed(chip, !chip.classList.contains("active"));
        });
        catWrap.appendChild(chip);
      });
    }

    form.querySelectorAll("#ce-browsers .pick-chip").forEach(function (chip) {
      setPressed(chip, chip.classList.contains("active"));
      chip.addEventListener("click", function () {
        setPressed(chip, !chip.classList.contains("active"));
      });
    });

    function setPressed(chip, on) {
      chip.classList.toggle("active", on);
      chip.setAttribute("aria-pressed", String(on));
    }

    function fieldEl(name) {
      return form.querySelector('[data-field="' + name + '"]');
    }

    function errorEl(name) {
      return form.querySelector('[data-error-for="' + name + '"]');
    }

    function setError(name, message) {
      var field = fieldEl(name);
      var err = errorEl(name);
      if (!field || !err) return;
      field.classList.add("invalid");
      err.textContent = message;
      err.hidden = false;
      var control = field.querySelector("input, textarea");
      if (control) control.setAttribute("aria-invalid", "true");
    }

    function clearError(name) {
      var field = fieldEl(name);
      var err = errorEl(name);
      if (!field || !err) return;
      field.classList.remove("invalid");
      err.textContent = "";
      err.hidden = true;
      var control = field.querySelector("input, textarea");
      if (control) control.removeAttribute("aria-invalid");
    }

    function clearAllErrors() {
      REQUIRED.concat("source").forEach(clearError);
    }

    [nameEl, devEl, descEl, sourceEl].forEach(function (el) {
      el.addEventListener("input", function () {
        clearError(el.name);
      });
    });

    function syncDescCount() {
      descCount.textContent = descEl.value.length + " / " + MAX_DESC;
    }
    descEl.addEventListener("input", syncDescCount);
    syncDescCount();

    function formatSize(bytes) {
      if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
      return Math.max(1, Math.round(bytes / 1024)) + " KB";
    }

    function syncFile() {
      var file = fileEl.files && fileEl.files[0];
      if (!file) {
        dropZone.classList.remove("filled");
        fileNameEl.textContent = "";
        fileNameEl.classList.remove("show");
        return;
      }
      dropZone.classList.add("filled");
      fileNameEl.textContent = file.name + " · " + formatSize(file.size);
      fileNameEl.classList.add("show");
      clearError("file");
    }

    fileEl.addEventListener("change", syncFile);

    dropZone.addEventListener("dragenter", function (event) {
      event.preventDefault();
      dropZone.classList.add("dragover");
    });
    dropZone.addEventListener("dragover", function (event) {
      event.preventDefault();
      dropZone.classList.add("dragover");
    });
    dropZone.addEventListener("dragleave", function () {
      dropZone.classList.remove("dragover");
    });
    dropZone.addEventListener("drop", function (event) {
      event.preventDefault();
      dropZone.classList.remove("dragover");
      var dropped = event.dataTransfer && event.dataTransfer.files;
      if (!dropped || !dropped.length) return;
      try {
        fileEl.files = dropped;
      } catch (e) {
        return;
      }
      syncFile();
    });

    function isHttpUrl(value) {
      return /^https?:\/\/\S+$/i.test(value);
    }

    function validate() {
      var errors = [];

      if (!nameEl.value.trim())
        errors.push(["name", "Give your extension a name."]);
      if (!devEl.value.trim())
        errors.push(["developer", "Add the developer or team behind it."]);

      var description = descEl.value.trim();
      if (!description)
        errors.push(["description", "Describe what the extension does."]);
      else if (description.length < 10)
        errors.push(["description", "Use at least 10 characters."]);

      if (!fileEl.files || !fileEl.files.length)
        errors.push(["file", "Attach a .zip bundle."]);
      else if (!/\.zip$/i.test(fileEl.files[0].name))
        errors.push(["file", "Packages must be a .zip bundle."]);

      if (!picked("ce-categories", "data-category").length)
        errors.push(["categories", "Pick at least one category."]);

      var source = sourceEl.value.trim();
      if (source && !isHttpUrl(source))
        errors.push([
          "source",
          "Use a full URL, like https://github.com/you/repo.",
        ]);

      return errors;
    }

    function picked(wrapId, attribute) {
      var keys = [];
      form
        .querySelectorAll("#" + wrapId + " .pick-chip.active")
        .forEach(function (chip) {
          keys.push(chip.getAttribute(attribute));
        });
      return keys;
    }

    function sourceKey(url) {
      var host = "";
      try {
        host = new URL(url).hostname.toLowerCase();
      } catch (e) {
        return "other";
      }
      if (host.indexOf("github") !== -1) return "github";
      if (host.indexOf("gitlab") !== -1) return "gitlab";
      if (host.indexOf("bitbucket") !== -1) return "bitbucket";
      return "other";
    }

    function collect() {
      var data = new FormData();
      data.append("name", nameEl.value.trim());
      data.append("description", descEl.value.trim());
      data.append("developer", devEl.value.trim());
      data.append("file", fileEl.files[0]);

      picked("ce-categories", "data-category").forEach(function (key) {
        data.append("categories", key);
      });

      var browsers = picked("ce-browsers", "data-browser");
      (browsers.length ? browsers : ["chrome"]).forEach(function (key) {
        data.append("supportedBrowsers", key);
      });

      var source = sourceEl.value.trim();
      if (source) data.append("source", sourceKey(source));

      return data;
    }

    function reset() {
      form.reset();
      form
        .querySelectorAll("#ce-categories .pick-chip")
        .forEach(function (chip) {
          setPressed(chip, false);
        });
      form.querySelectorAll("#ce-browsers .pick-chip").forEach(function (chip) {
        setPressed(chip, chip.getAttribute("data-browser") === "chrome");
      });
      clearAllErrors();
      syncDescCount();
      syncFile();
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearAllErrors();

      var errors = validate();
      if (errors.length) {
        errors.forEach(function (pair) {
          setError(pair[0], pair[1]);
        });
        var firstField = fieldEl(errors[0][0]);
        var control = firstField && firstField.querySelector("input, textarea");
        if (control) control.focus();
        return;
      }

      var payload = collect();
      var submittedName = nameEl.value.trim();
      submitBtn.disabled = true;
      submitLabel.textContent = "Publishing…";
      stateEl.textContent = "";
      stateEl.classList.remove("submitted");

      S.api.createExtension(payload).then(function (res) {
        submitBtn.disabled = false;
        submitLabel.textContent = "Publish extension";

        if (res.ok && res.data) {
          var createdId = res.data.id;
          stateEl.textContent = "Published";
          stateEl.classList.add("submitted");
          if (S.showToast)
            S.showToast("“" + submittedName + "” published", "save");
          reset();
          if (createdId) {
            window.setTimeout(function () {
              location.href =
                "/sprinkle-interface-html/pages/extensions.html?id=" +
                encodeURIComponent(createdId);
            }, 700);
          }
          return;
        }

        var message =
          res.status === 401 || res.status === 403
            ? "Sign in with a builder account to publish."
            : res.message || "Unable to publish this extension.";
        stateEl.textContent = "";
        stateEl.classList.remove("submitted");
        if (S.showToast) S.showToast(message, "info");
      });
    });
  }
})();
