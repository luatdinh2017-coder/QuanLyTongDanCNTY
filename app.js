/**
 * CẤU HÌNH LIÊN KẾT GOOGLE SHEETS
 * Thay thế đường link bên dưới bằng link xuất CSV của bảng tính Google Sheets của bạn.
 * Định dạng: https://docs.google.com/spreadsheets/d/[FILE_ID]/export?format=csv&gid=[GID]
 */
const DEFAULT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT-PLACEHOLDER/pub?output=csv";

// Bộ dữ liệu mẫu dùng hiển thị ngay nếu chưa có link thật
const MOCK_DATA = [
    { "Mã CS": "CN-001", "Tên cơ sở / Hộ": "Trang trại Hoàng Long", "Loại vật nuôi": "Heo thịt", "Quy mô (con)": "1200", "Địa bàn": "Củ Chi", "Tiêm phòng": "Đạt", "Chứng nhận": "VietGAHP" },
    { "Mã CS": "CN-002", "Tên cơ sở / Hộ": "Hộ chăn nuôi Ba Thắng", "Loại vật nuôi": "Bò sữa", "Quy mô (con)": "45", "Địa bàn": "Hóc Môn", "Tiêm phòng": "Đạt", "Chứng nhận": "An toàn dịch bệnh" },
    { "Mã CS": "CN-003", "Tên cơ sở / Hộ": "Trang trại Gà Tân Hiệp", "Loại vật nuôi": "Gà đẻ trứng", "Quy mô (con)": "15000", "Địa bàn": "Bình Chánh", "Tiêm phòng": "Đạt", "Chứng nhận": "VietGAHP" },
    { "Mã CS": "CN-004", "Tên cơ sở / Hộ": "Hộ chăn nuôi Sáu Dân", "Loại vật nuôi": "Vịt thịt", "Quy mô (con)": "800", "Địa bàn": "Cần Giờ", "Tiêm phòng": "Chưa", "Chứng nhận": "Không" },
    { "Mã CS": "CN-005", "Tên cơ sở / Hộ": "Công ty TNHH Chăn nuôi Việt Á", "Loại vật nuôi": "Heo nái", "Quy mô (con)": "600", "Địa bàn": "Củ Chi", "Tiêm phòng": "Đạt", "Chứng nhận": "VietGAHP" },
    { "Mã CS": "CN-006", "Tên cơ sở / Hộ": "Hộ chăn nuôi Năm Phong", "Loại vật nuôi": "Dê giống", "Quy mô (con)": "120", "Địa bàn": "Củ Chi", "Tiêm phòng": "Đạt", "Chứng nhận": "Không" },
    { "Mã CS": "CN-007", "Tên cơ sở / Hộ": "Trang trại Gia cầm Phú An", "Loại vật nuôi": "Gà thịt", "Quy mô (con)": "8500", "Địa bàn": "Hóc Môn", "Tiêm phòng": "Đạt", "Chứng nhận": "An toàn dịch bệnh" }
];

// Biến trạng thái toàn cục
let rawData = [];
let filteredData = [];
let currentPage = 1;
const recordsPerPage = 5;

let speciesChartInstance = null;
let locationChartInstance = null;

// Khởi chạy khi tài liệu HTML tải xong
document.addEventListener("DOMContentLoaded", () => {
    initUIEvents();
    loadData(DEFAULT_CSV_URL);
});

// Thiết lập sự kiện người dùng
function initUIEvents() {
    document.getElementById("btnApplySource").addEventListener("click", () => {
        let inputUrl = document.getElementById("sheetUrlInput").value.trim();
        if (inputUrl) {
            // Chuẩn hóa link nếu người dùng dán link bảng tính thông thường
            if (inputUrl.includes("docs.google.com/spreadsheets/d/")) {
                const match = inputUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
                if (match && match[1]) {
                    inputUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
                }
            }
            loadData(inputUrl);
        }
    });

    document.getElementById("btnReloadData").addEventListener("click", () => {
        const inputUrl = document.getElementById("sheetUrlInput").value.trim() || DEFAULT_CSV_URL;
        loadData(inputUrl);
    });

    document.getElementById("searchInput").addEventListener("input", applyFilters);
    document.getElementById("filterSpecies").addEventListener("change", applyFilters);
    document.getElementById("filterLocation").addEventListener("change", applyFilters);
}

// Tải dữ liệu từ URL CSV hoặc Fallback MOCK_DATA
function loadData(url) {
    const tableBody = document.getElementById("tableBody");
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">
        <div class="spinner-border spinner-border-sm text-success me-2"></div>Đang tải dữ liệu...
    </td></tr>`;

    Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            if (results.data && results.data.length > 0) {
                rawData = results.data;
                onDataLoaded();
            } else {
                useMockData("Không tìm thấy dòng dữ liệu hợp lệ trong file. Đang dùng dữ liệu mẫu.");
            }
        },
        error: function(err) {
            console.warn("Lỗi kết nối tệp trực tiếp, chuyển sang nạp dữ liệu mẫu minh họa.", err);
            useMockData("Không thể kết nối trực tiếp đến URL cung cấp. Hiển thị dữ liệu mẫu.");
        }
    });
}

function useMockData(noticeText) {
    rawData = MOCK_DATA;
    onDataLoaded();
    console.info(noticeText);
}

// Xử lý sau khi dữ liệu đã sẵn sàng
function onDataLoaded() {
    populateFilterDropdowns();
    applyFilters();
}

// Điền các lựa chọn vào dropdown lọc
function populateFilterDropdowns() {
    const speciesSet = new Set();
    const locationSet = new Set();

    rawData.forEach(item => {
        if (item["Loại vật nuôi"]) speciesSet.add(item["Loại vật nuôi"].trim());
        if (item["Địa bàn"]) locationSet.add(item["Địa bàn"].trim());
    });

    const speciesSelect = document.getElementById("filterSpecies");
    speciesSelect.innerHTML = '<option value="">-- Tất cả loài vật nuôi --</option>';
    speciesSet.forEach(sp => {
        speciesSelect.innerHTML += `<option value="${sp}">${sp}</option>`;
    });

    const locationSelect = document.getElementById("filterLocation");
    locationSelect.innerHTML = '<option value="">-- Tất cả địa bàn --</option>';
    locationSet.forEach(loc => {
        locationSelect.innerHTML += `<option value="${loc}">${loc}</option>`;
    });
}

// Áp dụng bộ lọc và từ khóa tìm kiếm
function applyFilters() {
    const keyword = document.getElementById("searchInput").value.toLowerCase().trim();
    const selectedSpecies = document.getElementById("filterSpecies").value;
    const selectedLocation = document.getElementById("filterLocation").value;

    filteredData = rawData.filter(item => {
        // Tìm kiếm toàn văn trên mọi trường
        const matchesKeyword = !keyword || Object.values(item).some(val => 
            String(val).toLowerCase().includes(keyword)
        );

        const matchesSpecies = !selectedSpecies || (item["Loại vật nuôi"] && item["Loại vật nuôi"].trim() === selectedSpecies);
        const matchesLocation = !selectedLocation || (item["Địa bàn"] && item["Địa bàn"].trim() === selectedLocation);

        return matchesKeyword && matchesSpecies && matchesLocation;
    });

    currentPage = 1;
    renderKPIs();
    renderCharts();
    renderTable();
}

// Tính toán và hiển thị thẻ KPI
function renderKPIs() {
    document.getElementById("statTotalFarms").innerText = filteredData.length.toLocaleString("vi-VN");

    let totalStock = 0;
    let certifiedCount = 0;
    let vaccinatedCount = 0;

    filteredData.forEach(item => {
        const stock = parseInt(String(item["Quy mô (con)"] || "0").replace(/[^0-9]/g, ""), 10);
        if (!isNaN(stock)) totalStock += stock;

        const cert = String(item["Chứng nhận"] || "").toLowerCase();
        if (cert && cert !== "không" && cert !== "chưa" && cert !== "none") {
            certifiedCount++;
        }

        const vac = String(item["Tiêm phòng"] || "").toLowerCase();
        if (vac.includes("đạt") || vac.includes("rồi") || vac.includes("có")) {
            vaccinatedCount++;
        }
    });

    document.getElementById("statTotalStock").innerText = totalStock.toLocaleString("vi-VN");
    document.getElementById("statCertifiedFarms").innerText = certifiedCount.toLocaleString("vi-VN");
    document.getElementById("statVaccinatedFarms").innerText = vaccinatedCount.toLocaleString("vi-VN");
}

// Vẽ biểu đồ Chart.js
function renderCharts() {
    // 1. Dữ liệu Cơ cấu vật nuôi
    const speciesCounts = {};
    filteredData.forEach(item => {
        const sp = item["Loại vật nuôi"] || "Khác";
        const qty = parseInt(String(item["Quy mô (con)"] || "0").replace(/[^0-9]/g, ""), 10) || 1;
        speciesCounts[sp] = (speciesCounts[sp] || 0) + qty;
    });

    const ctxSpecies = document.getElementById("chartSpecies").getContext("2d");
    if (speciesChartInstance) speciesChartInstance.destroy();

    speciesChartInstance = new Chart(ctxSpecies, {
        type: "doughnut",
        data: {
            labels: Object.keys(speciesCounts),
            datasets: [{
                data: Object.values(speciesCounts),
                backgroundColor: ["#2d6a4f", "#52b788", "#74c69d", "#b7e4c7", "#f3c68f", "#ee9b00", "#0077b6"]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: "bottom" }
            }
        }
    });

    // 2. Dữ liệu Phân bổ theo địa bàn
    const locationCounts = {};
    filteredData.forEach(item => {
        const loc = item["Địa bàn"] || "Chưa xác định";
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });

    const ctxLocation = document.getElementById("chartLocation").getContext("2d");
    if (locationChartInstance) locationChartInstance.destroy();

    locationChartInstance = new Chart(ctxLocation, {
        type: "bar",
        data: {
            labels: Object.keys(locationCounts),
            datasets: [{
                label: "Số cơ sở chăn nuôi",
                data: Object.values(locationCounts),
                backgroundColor: "#198754"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
}

// Hiển thị bảng dữ liệu kèm phân trang
function renderTable() {
    const tableHeaderRow = document.getElementById("tableHeaderRow");
    const tableBody = document.getElementById("tableBody");

    if (filteredData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Không tìm thấy bản ghi phù hợp.</td></tr>`;
        document.getElementById("paginationInfo").innerText = "Hiển thị 0 - 0 của 0 bản ghi";
        document.getElementById("paginationControls").innerHTML = "";
        return;
    }

    // Tự động dựng Header từ các trường của bản ghi đầu tiên
    const headers = Object.keys(filteredData[0]);
    tableHeaderRow.innerHTML = headers.map(h => `<th>${h}</th>`).join("");

    // Cắt lát dữ liệu theo trang
    const startIdx = (currentPage - 1) * recordsPerPage;
    const endIdx = startIdx + recordsPerPage;
    const pageData = filteredData.slice(startIdx, endIdx);

    tableBody.innerHTML = pageData.map(row => {
        return `<tr>` + headers.map(h => {
            const val = row[h] || "";
            // Gắn nhãn màu cho cột Tiêm phòng / Chứng nhận
            if (h === "Tiêm phòng" || h === "Chứng nhận") {
                const isGood = val.toLowerCase().includes("đạt") || val.toLowerCase().includes("vietgahp");
                return `<td><span class="${isGood ? 'badge-status-yes' : 'badge-status-no'}">${val}</span></td>`;
            }
            return `<td>${val}</td>`;
        }).join("") + `</tr>`;
    }).join("");

    // Cập nhật thông tin phân trang
    document.getElementById("paginationInfo").innerText = 
        `Hiển thị ${startIdx + 1} - ${Math.min(endIdx, filteredData.length)} của ${filteredData.length} bản ghi`;

    renderPaginationControls();
}

function renderPaginationControls() {
    const totalPages = Math.ceil(filteredData.length / recordsPerPage);
    const paginationControls = document.getElementById("paginationControls");
    paginationControls.innerHTML = "";

    if (totalPages <= 1) return;

    // Nút lùi
    paginationControls.innerHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">&laquo;</a>
        </li>
    `;

    for (let p = 1; p <= totalPages; p++) {
        paginationControls.innerHTML += `
            <li class="page-item ${p === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${p}); return false;">${p}</a>
            </li>
        `;
    }

    // Nút tiến
    paginationControls.innerHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">&raquo;</a>
        </li>
    `;
}

function changePage(page) {
    currentPage = page;
    renderTable();
}
