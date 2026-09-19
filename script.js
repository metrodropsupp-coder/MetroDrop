"use strict";

document.documentElement.classList.add("js-ready");

const menuToggle = document.querySelector(".menu-toggle");
const mainMenu = document.querySelector(".main-nav");
const clickSounds = Array.from({ length: 4 }, () => {
	const sound = new Audio("sounds/click_default.mp3");
	sound.preload = "auto";
	sound.volume = 0.9;
	return sound;
});
let nextClickSound = 0;
const currencyStorageKey = "metroDropCurrencyMode";
let activeCurrency = localStorage.getItem(currencyStorageKey) === "uc" ? "uc" : "metro";
const metroToUcRate = 100000 / 60;

const formatCurrencyValue = (metroValue) => {
	const value = Number(metroValue) || 0;
	if (activeCurrency === "uc") {
		return (value / metroToUcRate).toFixed(2).replace(/\.00$/, "");
	}
	return String(Math.round(value));
};

const updateHomeCasePrices = () => {
	document.querySelectorAll("[data-base-price]").forEach((price) => {
		price.firstChild.textContent = formatCurrencyValue(price.dataset.basePrice);
		const currency = price.querySelector("img");
		if (currency) {
			currency.src = activeCurrency === "uc" ? "img/uc.png" : "img/metro_money.png";
			currency.alt = activeCurrency === "uc" ? "UC" : "Метровалюты";
		}
	});
};

const promoBars = Array.from(document.querySelectorAll(".home-promo-dots span"));
const promoSlides = Array.from(document.querySelectorAll(".home-promo-slide:not(.home-promo-clone)"));
const promoTrack = document.querySelector(".home-promo-track");
const promoSlidesRow = document.querySelector(".home-promo-slides");
let activePromoBar = 0;
let promoPointerStartX = 0;
let promoPointerStartY = 0;
let isPromoDragging = false;
let promoAutoplayTimer;

const showPromoSlide = (index) => {
	const nextPromoBar = (index + promoBars.length) % promoBars.length;
	const isForwardLoop = activePromoBar === promoSlides.length - 1 && nextPromoBar === 0;
	activePromoBar = isForwardLoop ? promoSlides.length : nextPromoBar;
	promoBars.forEach((bar, barIndex) => bar.classList.toggle("is-active", barIndex === nextPromoBar));
	promoSlides.forEach((slide, slideIndex) => slide.setAttribute("aria-hidden", String(slideIndex !== nextPromoBar)));
	if (promoSlidesRow) {
		promoSlidesRow.style.transform = `translateX(-${activePromoBar * 25}%)`;
	}

	if (isForwardLoop) {
		window.setTimeout(() => {
			if (activePromoBar !== promoSlides.length) return;
			promoSlidesRow.style.transition = "none";
			activePromoBar = 0;
			promoSlidesRow.style.transform = "translateX(0)";
			void promoSlidesRow.offsetWidth;
			promoSlidesRow.style.transition = "";
		}, 650);
	}
};

if (promoBars.length && promoSlides.length === promoBars.length) {
	showPromoSlide(0);
}

const schedulePromoAutoplay = () => {
	window.clearTimeout(promoAutoplayTimer);
	promoAutoplayTimer = window.setTimeout(() => {
		showPromoSlide(activePromoBar + 1);
		schedulePromoAutoplay();
	}, 5000);
};

promoBars.forEach((bar, index) => {
	bar.addEventListener("click", () => {
		showPromoSlide(index);
		schedulePromoAutoplay();
	});
});

promoTrack?.addEventListener("pointerdown", (event) => {
	promoPointerStartX = event.clientX;
	promoPointerStartY = event.clientY;
	isPromoDragging = true;
	try {
		promoTrack.setPointerCapture(event.pointerId);
	} catch {
	}
});

promoTrack?.addEventListener("pointerup", (event) => {
	if (!isPromoDragging) return;
	isPromoDragging = false;
	const horizontalDistance = event.clientX - promoPointerStartX;
	const verticalDistance = event.clientY - promoPointerStartY;
	if (Math.abs(horizontalDistance) < 40 || Math.abs(horizontalDistance) < Math.abs(verticalDistance)) return;
	showPromoSlide(activePromoBar + (horizontalDistance < 0 ? 1 : -1));
	schedulePromoAutoplay();
});

promoTrack?.addEventListener("pointercancel", () => {
	isPromoDragging = false;
});

if (promoBars.length > 1 && promoSlides.length === promoBars.length) {
	schedulePromoAutoplay();
}

const renderHomeCases = async () => {
	const container = document.querySelector("#homeCaseSections");
	if (!container) return;

	let sections = [];
	let cases = [];
	try {
		const remoteState = await window.metroDropSupabase.load();
		sections = remoteState.sections;
		cases = remoteState.cases.map((item) => ({ ...item, sectionId: item.section_id ?? item.sectionId }));
	} catch (error) {
		sections = [];
		cases = [];
		console.error("Supabase unavailable", error);
	}
	container.replaceChildren();

	sections.forEach((section) => {
		const sectionElement = document.createElement("section");
		sectionElement.className = "home-case-section";
		sectionElement.dataset.sectionId = section.id;

		const heading = document.createElement("div");
		heading.className = "home-case-heading";
		const title = document.createElement("h2");
		title.textContent = section.name;
		heading.append(title);
		if (section.description) {
			const description = document.createElement("p");
			description.textContent = section.description;
			heading.append(description);
		}
		sectionElement.append(heading);

		const grid = document.createElement("div");
		grid.className = "home-case-grid";
		cases.filter((item) => item.sectionId === section.id).forEach((item) => {
			const card = document.createElement("a");
			card.className = "home-case-card";
			card.href = `case.html?id=${encodeURIComponent(item.id)}`;
			card.setAttribute("aria-label", `Открыть кейс ${item.name}`);
			const image = document.createElement("img");
			image.src = item.image;
			image.alt = item.name;
			image.loading = "lazy";
			card.append(image);
			const title = document.createElement("h3");
			title.textContent = item.name;
			card.append(title);
			const price = document.createElement("span");
			price.className = "home-case-price";
			price.dataset.basePrice = Number(item.price) || 0;
			price.append(document.createTextNode(formatCurrencyValue(item.price)));
			const currency = document.createElement("img");
			currency.src = activeCurrency === "uc" ? "img/uc.png" : "img/metro_money.png";
			currency.alt = activeCurrency === "uc" ? "UC" : "Метровалюты";
			price.append(currency);
			card.append(price);
			if (item.description) {
				const description = document.createElement("p");
				description.textContent = item.description;
				card.append(description);
			}
			grid.append(card);
		});
		sectionElement.append(grid);
		container.append(sectionElement);
	});
};

renderHomeCases();

const playClickSound = () => {
	const sound = clickSounds[nextClickSound];
	nextClickSound = (nextClickSound + 1) % clickSounds.length;
	sound.currentTime = 0;
	sound.play().catch(() => {});
};

const questsSound = new Audio("sounds/click_quests_collection.mp3");
questsSound.preload = "auto";
questsSound.volume = 0.9;
const missionNavigationKey = "metroDropPlayMissionSound";

const verstakSound = new Audio("sounds/verstak.mp3");
verstakSound.preload = "auto";
verstakSound.volume = 0.9;
const verstakNavigationKey = "metroDropPlayVerstakSound";
const pageSound = new Audio("sounds/page.mp3");
pageSound.preload = "auto";
pageSound.volume = 0.9;
const pageNavigationKey = "metroDropPlayPageSound";
const missionsSound = new Audio("sounds/missions.mp3");
missionsSound.preload = "auto";
missionsSound.volume = 0.4;
const missionsNavigationKey = "metroDropPlayMissionsSound";

const playPendingNavigationSound = (sound, storageKey) => {
	if (sessionStorage.getItem(storageKey) !== "true") {
		return;
	}
	sessionStorage.removeItem(storageKey);

	const attemptPlayback = () => {
		sound.currentTime = 0;
		const playback = sound.play();
		if (playback?.catch) {
			playback.catch(() => {
				document.addEventListener("pointerdown", attemptPlayback, { once: true });
				document.addEventListener("keydown", attemptPlayback, { once: true });
			});
		}
	};

	attemptPlayback();
};

playPendingNavigationSound(questsSound, missionNavigationKey);
playPendingNavigationSound(verstakSound, verstakNavigationKey);
playPendingNavigationSound(pageSound, pageNavigationKey);
playPendingNavigationSound(missionsSound, missionsNavigationKey);
menuToggle.addEventListener("click", () => {
	const isOpen = mainMenu.classList.toggle("is-open");
	menuToggle.classList.toggle("is-open", isOpen);
	menuToggle.setAttribute("aria-expanded", String(isOpen));
	menuToggle.querySelector(".visually-hidden").textContent = isOpen
		? "Закрыть меню"
		: "Открыть меню";
	playClickSound();
});

document.querySelectorAll(".mobile-menu-item").forEach((menuItem) => {
	menuItem.addEventListener("click", (event) => {
		if (menuItem.getAttribute("href")?.includes("#upgrade")) {
			event.preventDefault();
			giveEpicBackpack();
		}
		mainMenu.classList.remove("is-open");
		menuToggle.classList.remove("is-open");
		menuToggle.setAttribute("aria-expanded", "false");
		menuToggle.querySelector(".visually-hidden").textContent = "Открыть меню";
	});
});

const navigateWithMenuClose = (href, pageKey) => {
	if (mainMenu?.classList.contains("is-open")) {
		mainMenu.classList.remove("is-open");
		menuToggle.classList.remove("is-open");
		menuToggle.setAttribute("aria-expanded", "false");
		menuToggle.querySelector(".visually-hidden").textContent = "Открыть меню";
	}

	sessionStorage.setItem(pageKey, "true");
	window.setTimeout(() => {
		window.location.href = href;
	}, 150);
};

document.querySelectorAll(".nav-link, .login-button, .mobile-menu-item").forEach((link) => {
	link.addEventListener("click", (event) => {
		const href = link.getAttribute("href");
		if (!href || !href.includes(".html")) {
			return;
		}
		event.preventDefault();
		if (href.includes("workbench.html")) {
			navigateWithMenuClose(href, verstakNavigationKey);
			return;
		}
		if (href.includes("missions.html")) {
			navigateWithMenuClose(href, missionsNavigationKey);
			return;
		}
		navigateWithMenuClose(href, pageNavigationKey);
	});
});

document.querySelectorAll(".auth-button, .form-submit, .form-back, .workbench-action, .recipe-card, .chance-btn").forEach((button) => {
	button.addEventListener("click", playClickSound);
});

document.querySelectorAll(".profile-link-button").forEach((button) => {
	if (button.matches('a[href="missions.html"]')) {
		button.addEventListener("click", () => sessionStorage.setItem(missionsNavigationKey, "true"));
		return;
	}
	if (button.matches(".mission-entry")) {
		return;
	}
	button.addEventListener("click", () => {
		questsSound.currentTime = 0;
		questsSound.play().catch(() => {});
	});
});

document.querySelectorAll(".mission-go-button").forEach((button) => {
	button.addEventListener("click", () => sessionStorage.setItem(missionNavigationKey, "true"));
});

const topUpModal = document.querySelector("[data-top-up-modal]");
const topUpButton = document.querySelector(".profile-balance-add");
const topUpClose = topUpModal?.querySelector("[data-top-up-close]");

const closeTopUpModal = () => {
	if (!topUpModal) {
		return;
	}
	topUpModal.hidden = true;
	topUpModal.classList.remove("is-visible");
};

topUpButton?.addEventListener("click", () => {
	if (!topUpModal) {
		return;
	}
	topUpModal.hidden = false;
	topUpModal.classList.add("is-visible");
	topUpModal.querySelector(".top-up-currency")?.focus();
	playClickSound();
});

topUpClose?.addEventListener("click", closeTopUpModal);
topUpModal?.addEventListener("click", (event) => {
	if (event.target === topUpModal) {
		closeTopUpModal();
	}
});

document.addEventListener("keydown", (event) => {
	if (event.key === "Escape" && topUpModal && !topUpModal.hidden) {
		closeTopUpModal();
	}
});

topUpModal?.querySelectorAll("[data-top-up-currency]").forEach((button) => {
	button.addEventListener("click", () => {
		topUpModal.querySelectorAll("[data-top-up-currency]").forEach((item) => item.classList.remove("is-selected"));
		button.classList.add("is-selected");
		topUpModal.querySelectorAll("[data-top-up-shop]").forEach((shop) => {
			shop.hidden = shop.dataset.topUpShop !== button.dataset.topUpCurrency;
		});
	});
});

topUpModal?.querySelectorAll("[data-top-up-url]").forEach((product) => {
	product.addEventListener("click", () => {
		window.location.href = product.dataset.topUpUrl;
	});
});

document.querySelectorAll(".recipe-card").forEach((recipe) => {
	recipe.addEventListener("click", () => {
		document.querySelectorAll(".recipe-card").forEach((item) => item.classList.remove("is-selected"));
		recipe.classList.add("is-selected");
	});
});

const workbenchCrate = document.querySelector(".workbench-crate");
const workbenchBox = document.querySelector(".workbench-box");
const getButton = document.querySelector(".workbench-get-button");
const disassembleButton = document.querySelector(".workbench-disassemble-button");
const boostButton = document.querySelector(".workbench-boost-button");
const workbenchTimer = document.querySelector(".workbench-timer");
const timeCardValue = document.querySelector(".time-card-header span");
const rewardControls = document.querySelector(".workbench-reward-controls");
const boostLabel = document.querySelector(".workbench-boost-label");
const boostCost = document.querySelector(".workbench-boost-cost");
const openLabel = document.querySelector(".workbench-open-label");
const lootModal = document.querySelector("[data-loot-modal]");
const rewardSound = new Audio("sounds/reward.mp3");
rewardSound.preload = "auto";

if (workbenchCrate && workbenchBox && getButton && disassembleButton && boostButton && workbenchTimer && timeCardValue && rewardControls && boostLabel && boostCost && openLabel && lootModal) {
	let remainingSeconds = 24 * 60 * 60;
	let timerStarted = false;
	let timeCards = Number.parseInt(timeCardValue.textContent, 10) || 0;
	let countdownTimer;
	let boostInProgress = false;

	const formatTimer = () => {
		const hours = Math.floor(remainingSeconds / 3600);
		const minutes = Math.floor((remainingSeconds % 3600) / 60);
		const seconds = remainingSeconds % 60;
		return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
	};

	const openBox = () => {
		if (remainingSeconds === 0) {
			workbenchBox.src = "img/box_open.png";
			workbenchBox.alt = "Открытый ящик";
			boostButton.disabled = false;
			boostButton.classList.remove("is-empty");
			boostButton.classList.add("is-opened");
			boostLabel.hidden = true;
			boostCost.hidden = true;
			openLabel.hidden = false;
		}
	};

	getButton.addEventListener("click", () => {
		workbenchCrate.classList.add("is-open");
		workbenchBox.hidden = false;
		getButton.hidden = true;
		disassembleButton.hidden = false;
	});

	disassembleButton.addEventListener("click", () => {
		if (timerStarted) {
			return;
		}
		timerStarted = true;
		rewardControls.appendChild(workbenchTimer);
		disassembleButton.hidden = true;
		boostButton.hidden = false;
		workbenchTimer.classList.add("is-active");
		workbenchTimer.hidden = false;
		workbenchTimer.textContent = formatTimer();
		if (timeCards === 0) {
			boostButton.disabled = true;
			boostButton.classList.add("is-empty");
		}

		countdownTimer = window.setInterval(() => {
			remainingSeconds = Math.max(remainingSeconds - 60, 0);
			workbenchTimer.textContent = formatTimer();
			openBox();
			if (remainingSeconds === 0) {
				window.clearInterval(countdownTimer);
			}
		}, 1000);
	});

	boostButton.addEventListener("click", () => {
		if (boostButton.classList.contains("is-opened")) {
			lootModal.hidden = false;
			lootModal.classList.add("is-visible");
			rewardSound.currentTime = 0;
			rewardSound.play().catch(() => {});
			return;
		}
		if (timeCards === 0) {
			return;
		}
		if (boostInProgress) {
			return;
		}
		timeCards -= 1;
		const startSeconds = remainingSeconds;
		const targetSeconds = Math.max(startSeconds - 5 * 60 * 60, 0);
		const animationStart = performance.now();
		const animationDuration = 420;
		boostInProgress = true;
		boostButton.disabled = true;
		window.clearInterval(countdownTimer);

		const animateReduction = (now) => {
			const progress = Math.min((now - animationStart) / animationDuration, 1);
			remainingSeconds = Math.round(startSeconds - (startSeconds - targetSeconds) * progress);
			workbenchTimer.textContent = formatTimer();
			if (progress < 1) {
				window.requestAnimationFrame(animateReduction);
				return;
			}
			remainingSeconds = targetSeconds;
			openBox();
			boostInProgress = false;
			if (remainingSeconds > 0 && timeCards > 0) {
				boostButton.disabled = false;
			}
			countdownTimer = window.setInterval(() => {
				remainingSeconds = Math.max(remainingSeconds - 60, 0);
				workbenchTimer.textContent = formatTimer();
				openBox();
				if (remainingSeconds === 0) {
					window.clearInterval(countdownTimer);
				}
			}, 1000);
		};

		window.requestAnimationFrame(animateReduction);
		timeCardValue.textContent = String(timeCards);
		if (timeCards === 0) {
			boostButton.disabled = true;
			boostButton.classList.add("is-empty");
		}
	});

	lootModal.addEventListener("click", (event) => {
		if (event.target === lootModal) {
			lootModal.hidden = true;
			lootModal.classList.remove("is-visible");
		}
	});

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			lootModal.hidden = true;
			lootModal.classList.remove("is-visible");
		}
	});
}

const authPanel = document.querySelector(".auth-panel");
const authChoice = authPanel?.querySelector(".auth-actions");
const authCopy = authPanel?.querySelector(".auth-copy");
const authLogo = authPanel?.querySelector(".auth-logo");
const authPage = document.querySelector(".auth-page");
const authForms = authPanel?.querySelectorAll(".auth-form");
const accountStorageKey = "metroDropAccount";

const renderHeaderBalance = () => {
	const balanceCard = document.querySelector("[data-balance-card]");
	const balanceValue = document.querySelector("[data-balance]");
	const balanceCurrency = document.querySelector("[data-balance-currency]");
	const accountData = localStorage.getItem(accountStorageKey);
	const isLoggedIn = localStorage.getItem("metroDropLoggedIn") === "true";

	if (!balanceCard || !balanceValue) {
		return;
	}

	if (!isLoggedIn || !accountData) {
		balanceCard.hidden = true;
		return;
	}

	const account = JSON.parse(accountData);
	balanceValue.textContent = formatCurrencyValue(account.balance);
	if (balanceCurrency) {
		balanceCurrency.src = activeCurrency === "uc" ? "img/uc.png" : "img/metro_money.png";
		balanceCurrency.alt = activeCurrency === "uc" ? "UC" : "Метровалюты";
	}
	balanceCard.hidden = false;
};

const toggleCurrency = () => {
	activeCurrency = activeCurrency === "metro" ? "uc" : "metro";
	localStorage.setItem(currencyStorageKey, activeCurrency);
	renderHeaderBalance();
	updateHomeCasePrices();
	if (typeof window.updateCaseActionPrice === "function") {
		window.updateCaseActionPrice();
	}
	if (typeof window.updateCaseItemPrices === "function") {
		window.updateCaseItemPrices();
	}
};

document.querySelector("[data-balance-card]")?.addEventListener("click", toggleCurrency);
document.querySelector("[data-balance-card]")?.addEventListener("keydown", (event) => {
	if (event.key === "Enter" || event.key === " ") {
		event.preventDefault();
		toggleCurrency();
	}
});

const normalizePlayerName = (name) => {
	const trimmedName = String(name).trim();
	if (trimmedName && trimmedName === trimmedName.toUpperCase()) {
		return trimmedName.toLowerCase().replace(/^\S/, (character) => character.toUpperCase());
	}
	return trimmedName;
};

const restoreProfileData = () => {
	const accountData = localStorage.getItem(accountStorageKey);
	if (!accountData) {
		return;
	}

	const account = JSON.parse(accountData);
	const profileName = document.querySelector('[data-profile="name"]');
	const profileId = document.querySelector('[data-profile="id"]');
	const profileBalance = document.querySelector('[data-profile="balance"]');

	if (profileName) {
		profileName.textContent = normalizePlayerName(account.name);
	}
	if (profileId) {
		profileId.textContent = account.id;
	}
	if (profileBalance) {
		profileBalance.textContent = Number.isFinite(Number(account.balance)) ? account.balance : "0";
	}
};

restoreProfileData();
renderHeaderBalance();

document.querySelector("[data-copy-id]")?.addEventListener("click", async (event) => {
	const id = document.querySelector('[data-profile="id"]')?.textContent;
	const message = event.currentTarget.parentElement.querySelector(".copy-message");

	if (!id) {
		return;
	}

	try {
		await navigator.clipboard.writeText(id);
		message.textContent = "ID скопирован";
	} catch {
		message.textContent = "Не удалось скопировать";
	}

	setTimeout(() => {
		message.textContent = "";
	}, 1600);
});

const showAuthMessage = (message, isError = false, form = null) => {
	const formMessage = form?.querySelector(".form-message");
	if (!formMessage) {
		return;
	}
	formMessage.textContent = message;
	formMessage.classList.toggle("is-error", isError);
};

const showAuthForm = (formId) => {
	if (!authChoice || !authForms) {
		return;
	}
	authChoice.hidden = true;
	authCopy.hidden = true;
	authLogo.hidden = true;
	authForms.forEach((form) => {
		if (form.dataset.authForm === formId) {
			form.removeAttribute("hidden");
			form.classList.add("is-visible");
		} else {
			form.setAttribute("hidden", "");
			form.classList.remove("is-visible");
		}
	});
	authForms.forEach((form) => showAuthMessage("", false, form));
	const firstInput = document.querySelector(`[data-auth-form="${formId}"] input`);
	firstInput?.focus();
};

const showAuthChoice = () => {
	if (!authChoice || !authForms) {
		return;
	}
	authChoice.hidden = false;
	authCopy.hidden = false;
	authLogo.hidden = false;
	authForms.forEach((form) => {
		form.setAttribute("hidden", "");
		form.classList.remove("is-visible");
	});
	authForms.forEach((form) => showAuthMessage("", false, form));
};

const closeAuthPage = () => {
	if (authPage) {
		authPage.hidden = true;
	}
};

const restoreAuthState = () => {
	if (localStorage.getItem("metroDropLoggedIn") !== "true") {
		return;
	}

	const profileLinks = [
		document.querySelector(".main-nav > .nav-link"),
		document.querySelector(".mobile-menu-item"),
		document.querySelector(".login-button")
	];

	profileLinks.forEach((link) => {
		if (link) {
			link.textContent = "ПРОФИЛЬ";
			link.href = "profile.html";
		}
	});
	closeAuthPage();
};

restoreAuthState();

document.querySelectorAll("[data-auth-view]").forEach((button) => {
	button.addEventListener("click", () => showAuthForm(button.dataset.authView));
});

document.querySelectorAll(".form-back").forEach((button) => {
	button.addEventListener("click", showAuthChoice);
});

document.querySelector('input[name="id"]')?.addEventListener("input", (event) => {
	event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 11);
});

const playerNameInput = document.querySelector('input[name="name"]');
const validatePlayerName = () => {
	if (playerNameInput) {
		playerNameInput.setCustomValidity(
			/[A-Za-zА-Яа-яЁё]/.test(playerNameInput.value)
				? ""
				: "Имя игрока должно содержать хотя бы одну букву"
		);
	}
};

playerNameInput?.addEventListener("input", validatePlayerName);
validatePlayerName();

document.querySelectorAll(".auth-form").forEach((form) => {
	const submitButton = form.querySelector(".form-submit");
	const updateSubmitState = () => {
		submitButton.disabled = !form.checkValidity();
	};

	form.addEventListener("input", updateSubmitState);
	updateSubmitState();
});

document.querySelector('[data-auth-form="registration"]')?.addEventListener("submit", (event) => {
	event.preventDefault();
	const formData = new FormData(event.currentTarget);
	const account = {
		name: normalizePlayerName(formData.get("name")),
		id: formData.get("id"),
		password: formData.get("password"),
		balance: 0
	};
	const existingAccount = localStorage.getItem(accountStorageKey);

	if (existingAccount && JSON.parse(existingAccount).id === account.id) {
		showAuthMessage("Такой ID уже зарегистрирован.", true, event.currentTarget);
		return;
	}

	localStorage.setItem(accountStorageKey, JSON.stringify(account));
	localStorage.setItem("metroDropLoggedIn", "true");
	renderHeaderBalance();
	closeAuthPage();
});

document.querySelector('[data-auth-form="login"]')?.addEventListener("submit", (event) => {
	event.preventDefault();
	const formData = new FormData(event.currentTarget);
	const accountData = localStorage.getItem(accountStorageKey);
	const account = accountData ? JSON.parse(accountData) : null;
	const identifier = formData.get("identifier");

	if (!account || (account.name !== identifier && account.id !== identifier) || account.password !== formData.get("password")) {
		showAuthMessage("Неверное имя игрока, ID или пароль.", true, event.currentTarget);
		return;
	}

	localStorage.setItem("metroDropLoggedIn", "true");
	renderHeaderBalance();
	closeAuthPage();
});

const inventoryStorageKey = "metroDropInventory";
const defaultInventoryItems = [
	{ name: "РЮКЗАК", image: "items/backpack_4.png", rarity: "epic", rarityLabel: "ЭПИЧЕСКИЙ" },
	{ name: "МЕТРОВАЛЮТА", image: "items/money.png", rarity: "common", rarityLabel: "ОБЫЧНЫЙ" },
	{ name: "ВЕРСТАК", image: "items/workbench_ico.png", rarity: "rare", rarityLabel: "РЕДКИЙ" },
	{ name: "РЮКЗАК", image: "items/backpack_4.png", rarity: "epic", rarityLabel: "ЭПИЧЕСКИЙ" },
	{ name: "МЕТРОВАЛЮТА", image: "items/money.png", rarity: "common", rarityLabel: "ОБЫЧНЫЙ" },
	{ name: "ВЕРСТАК", image: "items/workbench_ico.png", rarity: "rare", rarityLabel: "РЕДКИЙ" },
	{ name: "МЕТРОВАЛЮТА", image: "items/money.png", rarity: "common", rarityLabel: "ОБЫЧНЫЙ" }
];

const ensureDefaultInventory = () => {
	try {
		const existingInventory = JSON.parse(localStorage.getItem(inventoryStorageKey) || "[]");
		if (!Array.isArray(existingInventory)) {
			localStorage.setItem(inventoryStorageKey, JSON.stringify(defaultInventoryItems));
			return;
		}

		if (existingInventory.length >= 7) {
			return;
		}

		const inventoryWithDefaults = [...existingInventory];
		while (inventoryWithDefaults.length < 7) {
			const defaultItem = defaultInventoryItems[inventoryWithDefaults.length % defaultInventoryItems.length];
			inventoryWithDefaults.push({ ...defaultItem });
		}

		localStorage.setItem(inventoryStorageKey, JSON.stringify(inventoryWithDefaults));
	} catch (error) {
		localStorage.setItem(inventoryStorageKey, JSON.stringify(defaultInventoryItems));
	}
};

const renderInventory = () => {
	const inventorySlots = document.querySelectorAll("[data-inventory-slot]");
	const inventory = JSON.parse(localStorage.getItem(inventoryStorageKey) || "[]");

	inventorySlots.forEach((slot, index) => {
		const item = inventory[index];
		if (!item) {
			slot.replaceChildren();
			slot.classList.remove("has-item", "rarity-epic");
			return;
		}

		slot.classList.add("has-item", `rarity-${item.rarity}`);
		slot.innerHTML = `<img class="inventory-item-image" src="${item.image}" alt="${item.name}"><span class="inventory-rarity" aria-hidden="true"></span>`;
	});
};

const selectedContractItemIndexes = new Set();
const contractSubmitButton = document.getElementById("contractSubmitButton");
const contractCardsWrap = document.querySelector(".contract-cards");
const contractLogo = document.querySelector(".contract-logo");
const contractReward = document.querySelector(".contract-reward");
let isContractAnimationRunning = false;

const updateContractSubmitButtonState = () => {
	if (!contractSubmitButton) return;

	const isReady = selectedContractItemIndexes.size >= 4;
	contractSubmitButton.disabled = !isReady;
	contractSubmitButton.setAttribute("aria-disabled", String(!isReady));
	contractSubmitButton.classList.toggle("is-disabled", !isReady);
};

const triggerContractCollectionAnimation = () => {
	if (!contractCardsWrap || isContractAnimationRunning) return;
	const inventory = JSON.parse(localStorage.getItem(inventoryStorageKey) || "[]");
	const selectedIndexes = new Set(selectedContractItemIndexes);
	const selectedItems = Array.from(selectedIndexes)
		.map((index) => inventory[index])
		.filter(Boolean);
	const rewardItem = selectedItems[0];
	if (!rewardItem) return;

	isContractAnimationRunning = true;
	contractCardsWrap.classList.remove("is-animating");
	void contractCardsWrap.offsetWidth;
	contractCardsWrap.classList.add("is-animating");
	window.setTimeout(() => {
		contractCardsWrap.classList.add("is-resetting");
		contractCardsWrap.classList.remove("is-animating");
		void contractCardsWrap.offsetWidth;
		window.requestAnimationFrame(() => {
			contractCardsWrap.classList.remove("is-resetting");
		});

		const remainingItems = inventory.filter((item, index) => !selectedIndexes.has(index));
		remainingItems.push({ ...rewardItem });
		localStorage.setItem(inventoryStorageKey, JSON.stringify(remainingItems));
		selectedContractItemIndexes.clear();
		activeContractCardIndex = null;
		renderContractCardAssignments();
		renderContractInventory();
		if (contractLogo && contractReward) {
			contractLogo.hidden = true;
			contractReward.src = rewardItem.image;
			contractReward.alt = rewardItem.name || "Предмет контракта";
			contractReward.hidden = false;
		}
		isContractAnimationRunning = false;
	}, 2000);
};

const renderContractInventory = () => {
	const grid = document.getElementById("contractInventoryGrid");
	if (!grid) return;

	const inventory = JSON.parse(localStorage.getItem(inventoryStorageKey) || "[]");
	grid.querySelectorAll(".inventory-slot").forEach((slot, index) => {
		const item = inventory[index];
		slot.replaceChildren();
		slot.dataset.itemIndex = String(index);
		slot.classList.remove("has-item", "rarity-epic", "is-selected", "is-picked");
		slot.setAttribute("aria-pressed", "false");

		if (!item) return;

		slot.classList.add("has-item", `rarity-${item.rarity}`);
		if (selectedContractItemIndexes.has(index)) {
			slot.classList.add("is-selected", "is-picked");
			slot.setAttribute("aria-pressed", "true");
			slot.style.display = "none";
			return;
		}

		slot.style.display = "";

		const image = document.createElement("img");
		image.className = "inventory-item-image";
		image.src = item.image;
		image.alt = item.name || "Предмет";
		slot.append(image);

		const rarity = document.createElement("span");
		rarity.className = "inventory-rarity";
		slot.append(rarity);
	});

	updateContractSubmitButtonState();
};

const contractInventoryPicker = document.getElementById("contractInventoryPicker");
const contractPage = document.querySelector(".contract-page");
const contractCards = document.querySelectorAll(".contract-card");
let activeContractCardIndex = null;

const renderContractCardAssignments = () => {
	if (!contractCards.length) return;

	const inventory = JSON.parse(localStorage.getItem(inventoryStorageKey) || "[]");
	const assignedItems = Array(contractCards.length).fill(null);
	const selectedItems = Array.from(selectedContractItemIndexes)
		.map((slotIndex) => inventory[slotIndex])
		.filter(Boolean);

	if (activeContractCardIndex !== null) {
		selectedItems.forEach((item, offset) => {
			const cardIndex = (activeContractCardIndex + offset) % contractCards.length;
			assignedItems[cardIndex] = item;
		});
	}

	contractCards.forEach((card, index) => {
		card.replaceChildren();
		const item = assignedItems[index];
		if (item) {
			const image = document.createElement("img");
			image.src = item.image;
			image.alt = item.name || "Предмет";
			card.append(image);
		}

		card.classList.toggle("has-item", Boolean(item));
		card.setAttribute("aria-label", item ? `Предмет контракта: ${item.name}` : `Предмет контракта ${index + 1}`);
	});
};

const closeContractInventory = () => {
	if (!contractInventoryPicker) return;
	contractInventoryPicker.classList.remove("is-open");
	contractInventoryPicker.setAttribute("aria-hidden", "true");
	contractCards.forEach((card) => card.classList.remove("is-selected"));
};

const resetContractSelection = () => {
	selectedContractItemIndexes.clear();
	if (!contractInventoryPicker) return;
	contractInventoryPicker.querySelectorAll(".inventory-slot").forEach((slot) => {
		slot.classList.remove("is-selected");
		slot.setAttribute("aria-pressed", "false");
	});
	updateContractSubmitButtonState();
	renderContractCardAssignments();
};

contractInventoryPicker?.addEventListener("click", (event) => {
	event.stopPropagation();
	const slot = event.target.closest(".inventory-slot");
	if (!slot || !slot.classList.contains("has-item")) return;

	const index = Number(slot.dataset.itemIndex);
	if (Number.isNaN(index)) return;

	if (selectedContractItemIndexes.has(index)) {
		selectedContractItemIndexes.delete(index);
		slot.classList.remove("is-selected", "is-picked");
		slot.style.display = "";
		slot.setAttribute("aria-pressed", "false");
		updateContractSubmitButtonState();
		renderContractCardAssignments();
		renderContractInventory();
		return;
	}

	selectedContractItemIndexes.add(index);
	slot.classList.add("is-selected", "is-picked");
	slot.setAttribute("aria-pressed", "true");
	updateContractSubmitButtonState();
	renderContractCardAssignments();
	renderContractInventory();
});

contractCards.forEach((card, index) => {
	card.dataset.contractCardIndex = String(index);
	card.addEventListener("click", (event) => {
		event.stopPropagation();
		if (contractLogo && contractReward) {
			contractLogo.hidden = false;
			contractReward.hidden = true;
		}
		const isOpen = contractInventoryPicker?.classList.contains("is-open");
		const isSameCard = card.classList.contains("is-selected");

		contractCards.forEach((item) => item.classList.remove("is-selected"));
		if (isOpen && isSameCard) {
			closeContractInventory();
			return;
		}

		activeContractCardIndex = index;
		resetContractSelection();
		card.classList.add("is-selected");
		if (!contractInventoryPicker) return;
		renderContractInventory();
		contractInventoryPicker.classList.add("is-open");
		contractInventoryPicker.setAttribute("aria-hidden", "false");
	});
});

contractSubmitButton?.addEventListener("click", (event) => {
	event.preventDefault();
	event.stopPropagation();
	if (contractSubmitButton.disabled) return;
	triggerContractCollectionAnimation();
});

window.addEventListener("click", (event) => {
	if (!contractInventoryPicker || !contractPage || isContractAnimationRunning) return;
	if (!contractPage.contains(event.target)) {
		closeContractInventory();
	}
});

const giveEpicBackpack = () => {
	const inventory = JSON.parse(localStorage.getItem(inventoryStorageKey) || "[]");
	if (!inventory.some((item) => item.image === "items/backpack_4.png")) {
		inventory.push({
			name: "РЮКЗАК",
			image: "items/backpack_4.png",
			rarity: "epic",
			rarityLabel: "ЭПИЧЕСКИЙ"
		});
		localStorage.setItem(inventoryStorageKey, JSON.stringify(inventory));
	}

	if (document.querySelector("[data-inventory-slot]")) {
		renderInventory();
	} else {
		window.location.href = "profile.html";
	}
};

ensureDefaultInventory();
renderInventory();