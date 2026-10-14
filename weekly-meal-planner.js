(() => {
"use strict";
const PLAN_KEY = "fb_plan_v1";
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const MEALS = ["Breakfast","Lunch","Dinner"];
const BREAKFAST_CATS = ["Breakfast"];
const MAIN_CATS = ["Lunch","Dinner","Kerala Foods","Biryani","Indian","Chinese","Arabic","Fast Food"];
let recipes = [];
const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function setStatus(message) { $("status").textContent = message; }
function readPlan() {
  try { const p = JSON.parse(localStorage.getItem(PLAN_KEY) || "{}"); return p && typeof p === "object" ? p : {}; }
  catch (_) { return {}; }
}
function writePlan(plan) {
  try { localStorage.setItem(PLAN_KEY, JSON.stringify(plan)); return true; }
  catch (_) { setStatus("Could not save in this browser. Check storage settings and try again."); return false; }
}
function slotKey(dayIndex, meal) { return dayIndex + "-" + meal; }
function getSelects() { return [...document.querySelectorAll("select[data-day][data-meal]")]; }
function currentPlan() {
  const plan = {};
  getSelects().forEach(select => { plan[slotKey(select.dataset.day, select.dataset.meal)] = select.value; });
  return plan;
}
function updatePrintValues() {
  getSelects().forEach(select => {
    const value = select.options[select.selectedIndex]?.textContent || "Not planned";
    const host = select.parentElement.querySelector(".meal-value");
    if (host) host.textContent = value === "Choose a recipe" ? "Not planned" : value;
  });
}
function render() {
  $("planGrid").innerHTML = DAYS.map((day, dayIndex) =>
    '<article class="day-card"><h2>' + day + '</h2>' +
    MEALS.map(meal => '<div class="meal"><label for="meal-' + dayIndex + '-' + meal + '">' + meal + '</label>' +
      '<select id="meal-' + dayIndex + '-' + meal + '" data-day="' + dayIndex + '" data-meal="' + meal + '">' +
      '<option value="">Choose a recipe</option>' +
      recipes.map(recipe => '<option value="' + esc(recipe.name) + '">' + esc(recipe.name) + '</option>').join("") +
      '</select><div class="meal-value" aria-hidden="true"></div></div>'
    ).join("") + '</article>'
  ).join("");
  const saved = readPlan();
  getSelects().forEach(select => {
    const name = saved[slotKey(select.dataset.day, select.dataset.meal)] || "";
    if (name && recipes.some(r => r.name === name)) select.value = name;
  });
  updatePrintValues();
}
function candidatesFor(meal) {
  const categories = meal === "Breakfast" ? BREAKFAST_CATS : MAIN_CATS;
  const exact = recipes.filter(r => categories.includes(String(r.category || "")));
  // Prefer a matching meal category; use all recipes only if the category has no entries.
  return exact.length ? exact : recipes;
}
function chooseRandom(meal, used) {
  let choices = candidatesFor(meal).filter(r => !used.has(r.name));
  if (!choices.length) choices = candidatesFor(meal);
  if (!choices.length) choices = recipes;
  const pick = choices[Math.floor(Math.random() * choices.length)];
  if (pick) used.add(pick.name);
  return pick ? pick.name : "";
}
function randomize(onlyEmpty) {
  const used = new Set();
  const selects = getSelects();
  // Keep already-selected meals in the no-repeat set when only filling blanks.
  if (onlyEmpty) selects.filter(s => s.value).forEach(s => used.add(s.value));
  selects.forEach(select => {
    if (onlyEmpty && select.value) return;
    select.value = chooseRandom(select.dataset.meal, used);
  });
  updatePrintValues();
  setStatus(onlyEmpty ? "Empty meal slots filled with random recipe ideas. Save your plan to keep the changes." : "A new random week is ready. Review the meals and save your plan.");
}
function buildPdfBlob() {
  if (!window.jspdf || !window.jspdf.jsPDF) return null;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 13;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(190, 76, 18);
  doc.text("FestiBites Weekly Meal Plan", margin, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 75, 65);
  doc.text("Breakfast  •  Lunch  •  Dinner", margin, 24);
  const colGap = 4, cardW = (width - margin * 2 - colGap) / 2, cardH = 54;
  const startY = 31, rowGap = 4;
  DAYS.forEach((day, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = margin + col * (cardW + colGap), y = startY + row * (cardH + rowGap);
    if (y + cardH > height - margin) { doc.addPage(); }
    const actualY = y + cardH > height - margin ? margin + 5 : y;
    doc.setDrawColor(225, 202, 187);
    doc.setFillColor(255, 250, 247);
    doc.roundedRect(x, actualY, cardW, cardH, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(58, 27, 15);
    doc.text(day, x + 4, actualY + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    let lineY = actualY + 15;
    MEALS.forEach(meal => {
      const select = document.querySelector('select[data-day="' + i + '"][data-meal="' + meal + '"]');
      const name = select && select.value ? select.value : "Not planned";
      doc.setFont("helvetica", "bold");
      doc.setTextColor(120, 85, 66);
      doc.text(meal + ":", x + 4, lineY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 35, 32);
      const mealLines = doc.splitTextToSize(name, cardW - 24);
      doc.text(mealLines.slice(0, 2), x + 22, lineY);
      lineY += Math.max(7, mealLines.slice(0, 2).length * 4.2);
    });
  });
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(120, 110, 100);
    doc.text("Made with FestiBites", margin, height - 6);
    doc.text("Page " + p + " of " + pages, width - margin, height - 6, { align: "right" });
  }
  return { doc, blob: doc.output("blob"), fileName: "FestiBites-Weekly-Meal-Plan.pdf" };
}
function printPlan() {
  updatePrintValues();
  document.title = "FestiBites-Weekly-Meal-Plan";
  window.print();
}
async function exportPdf(share) {
  const result = buildPdfBlob();
  if (!result) {
    setStatus("PDF export library could not load. Opening the print dialog instead—choose “Save as PDF”.");
    printPlan();
    return;
  }
  const file = new File([result.blob], result.fileName, { type: "application/pdf" });
  if (share && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "FestiBites Weekly Meal Plan", text: "My weekly meal plan from FestiBites." });
      setStatus("PDF share sheet opened.");
      return;
    } catch (error) {
      if (error && error.name === "AbortError") { setStatus("Sharing cancelled. Your plan is unchanged."); return; }
    }
  }
  result.doc.save(result.fileName);
  setStatus(share ? "PDF downloaded. If direct PDF sharing is not supported on this device, open the PDF from Downloads and use your device’s Share button." : "PDF downloaded. You can print it or share the downloaded file.");
}
async function loadRecipes() {
  try {
    const response = await fetch("./recipes.json");
    if (!response.ok) throw new Error("Could not load recipes.");
    const data = await response.json();
    recipes = (Array.isArray(data) ? data : []).filter(r => r && r.name).map(r => ({ name: String(r.name), category: String(r.category || "") }));
    if (!recipes.length) throw new Error("No recipes were found.");
    render();
    setStatus("Loaded " + recipes.length + " recipes. Randomize a week or choose meals yourself.");
  } catch (_) {
    $("planGrid").innerHTML = "<p>Recipes could not be loaded. Check your connection, then refresh this page.</p>";
    setStatus("Could not load recipes. Your previously saved plan has not been deleted.");
  }
}
$("randomizeAll").addEventListener("click", () => randomize(false));
$("randomizeEmpty").addEventListener("click", () => randomize(true));
$("savePlan").addEventListener("click", () => {
  updatePrintValues();
  if (writePlan(currentPlan())) setStatus("Weekly plan saved on this device.");
});
$("clearPlan").addEventListener("click", () => {
  getSelects().forEach(select => { select.value = ""; });
  updatePrintValues();
  try { localStorage.removeItem(PLAN_KEY); setStatus("Plan cleared from this device."); }
  catch (_) { setStatus("Plan cleared on screen, but browser storage could not be updated."); }
});
$("downloadPdf").addEventListener("click", () => exportPdf(false));
$("sharePdf").addEventListener("click", () => exportPdf(true));
$("printPdf").addEventListener("click", printPlan);
$("planGrid").addEventListener("change", event => {
  if (event.target.matches("select[data-day][data-meal]")) {
    updatePrintValues();
    setStatus("Meal changed. Tap Save plan to keep the changes.");
  }
});
window.addEventListener("beforeprint", updatePrintValues);
loadRecipes();
})();