// Config Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCDMuXBnwNtHS45mr2NaGwzJmIcFeCns4M",
  authDomain: "user-cc860.firebaseapp.com",
  projectId: "user-cc860",
  storageBucket: "user-cc860.appspot.com",
  messagingSenderId: "415059100394",
  appId: "1:415059100394:web:c8e03e6d340a4eca8a0d93",
  measurementId: "G-7WV328Z27C"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = (typeof firebase !== 'undefined') ? firebase.auth() : null;
const scriptURL = "https://script.google.com/macros/s/AKfycbwKK4iulnBVxoeZjIxjBxg8a3JnHyQqxEoQKtWA3mn1LYfj0lsNwuh0q0auFknCuMjy/exec";

let debounceTimer; 

// *** ตัวแปรสำหรับ Pagination (เพิ่มใหม่) ***
let allTableData = []; // เก็บข้อมูลทั้งหมด
let currentPage = 1;   // หน้าปัจจุบัน
const rowsPerPage = 10; // จำนวนแถวต่อหน้า

// *** Login/Logout ***
function login() {
  const emailVal = document.getElementById("email").value;
  const passVal = document.getElementById("password").value;
  if(!auth) { alert("Firebase not loaded"); return; }
  auth.signInWithEmailAndPassword(emailVal, passVal)
    .then(() => {
      document.getElementById("loginSection").style.display = "none";
      document.getElementById("mainApp").style.display = "block";
      showToast();
      debouncedLoadData(); 
      loadChartData(); 
    })
    .catch(error => alert("Login failed: " + error.message));
}

function logout() {
  if(auth) {
      auth.signOut().then(() => { 
        document.getElementById("loginSection").style.display = "block";
        document.getElementById("mainApp").style.display = "none";
      });
  }
}

// *** Helper Functions ***
const getFileIdFromUrl = (url) => {
    if (!url) return null;
    let match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];
    match = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];
    return null;
};

function debouncedLoadData() {
    clearTimeout(debounceTimer); 
    debounceTimer = setTimeout(loadData, 300); 
}

const getFullSizeUrl = (url) => {
    const fileId = getFileIdFromUrl(url); 
    if (!fileId) return '';
    return `https://drive.google.com/uc?id=${fileId}`; 
};

function deleteRow(rowIndex, sheetName) {
    if (!rowIndex || rowIndex === 'N/A') return;
    if (!confirm(`ต้องการลบข้อมูลแถวที่ ${rowIndex} จาก ${sheetName}?`)) return;
    const url = `${scriptURL}?action=delete&row=${rowIndex}&sheet=${encodeURIComponent(sheetName)}`;
    fetch(url, { method: 'GET', mode: 'no-cors' })
    .then(() => {
        setTimeout(() => {
            alert('ลบข้อมูลเรียบร้อย'); 
            debouncedLoadData(); 
        }, 1000); 
    })
    .catch(error => alert('Error delete: ' + error));
}

function showSection(id) {
  document.querySelectorAll('.nav-left button').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`btn${id.charAt(0).toUpperCase() + id.slice(1)}`).classList.add('active'); 
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'table') debouncedLoadData(); 
  if (id === 'chart') loadChartData(); 
}

// *** Form Submit ***
const auditForm = document.getElementById('auditForm');
if(auditForm){
    auditForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const date = new Date().toLocaleString('th-TH');
      const partNo = document.getElementById("partNo").value;
      const partName = document.getElementById("partName").value;
      const problem = document.getElementById("problem").value;
      const issue = document.getElementById("issue").value;
      const recorder = document.getElementById("recorder").value;
      const causer = document.getElementById("causer").value;
      const docType = document.getElementById("docType").value;
      const imageInput1 = document.getElementById("imageInput1"); 
      const imageInput2 = document.getElementById("imageInput2"); 
      
      const readFile = (file) => new Promise((resolve) => {
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload = function() { resolve(reader.result); };
        reader.readAsDataURL(file);
      });
      
      Promise.all([readFile(imageInput1?.files[0]), readFile(imageInput2?.files[0])]).then(results => {
        sendToGoogleSheets({ 
            date, partNo, partName, problem, issue, recorder, causer, 
            imageData1: results[0], imageData2: results[1], docType 
        });
      });
    });
}

function sendToGoogleSheets(record) {
  fetch(scriptURL, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify(record), 
  }).then(() => {
    alert('บันทึกข้อมูลเรียบร้อย');
    document.getElementById('auditForm').reset(); 
    if (document.getElementById('table').classList.contains('active')) {
      debouncedLoadData();
    }
  }).catch(error => console.error('Error:', error));
}

// ==========================================
// *** Load Table Data (ระบบแบ่งหน้า) ***
// ==========================================

// 1. ฟังก์ชันโหลดข้อมูลหลัก (ดึงมาเก็บใส่ตัวแปร allTableData)
function loadData() {
    const sheetName = document.getElementById('sheetSelector')?.value || 'Audit LG1';
    const fromDateValue = document.getElementById('fromDate').value;
    const toDateValue = document.getElementById('toDate').value;
    
    fetch(`${scriptURL}?sheet=${encodeURIComponent(sheetName)}`)
      .then(response => response.json())
      .then(data => {
        // กรองข้อมูลและเก็บไว้ในตัวแปร Global
        allTableData = filterByDate(data, fromDateValue, toDateValue);
        
        // รีเซ็ตไปหน้า 1 เสมอเมื่อโหลดใหม่
        currentPage = 1;
        
        // เรียกฟังก์ชันแสดงผล
        renderTable();
      }) 
      .catch(error => console.error('Error loading data:', error));
}

// 2. ฟังก์ชันแสดงผลตาราง (ตัดข้อมูลมาแสดงตามหน้า)
function renderTable() {
    const tbody = document.querySelector('#auditTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // คำนวณ Index เริ่มต้นและสิ้นสุด
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    
    // ตัดข้อมูลมาเฉพาะหน้านี้
    const pageData = allTableData.slice(startIndex, endIndex);

    const sheetName = document.getElementById('sheetSelector')?.value || 'Audit LG1';

    pageData.forEach(row => {
          const tr = document.createElement('tr');
          const fileId1 = getFileIdFromUrl(row['Image 1'] || '');
          const fileId2 = getFileIdFromUrl(row['Image 2'] || '');
          const modalUrl1 = getFullSizeUrl(row['Image 1']);
          const modalUrl2 = getFullSizeUrl(row['Image 2']);
          
          const thumbnailSrc1 = fileId1 ? `https://drive.google.com/thumbnail?id=${fileId1}&sz=s200` : ''; 
          const thumbnailSrc2 = fileId2 ? `https://drive.google.com/thumbnail?id=${fileId2}&sz=s200` : '';
          const imgTag1 = thumbnailSrc1 ? `<img src="${thumbnailSrc1}" class="thumbnail" onclick="openModal('${modalUrl1}')">` : ''; 
          const imgTag2 = thumbnailSrc2 ? `<img src="${thumbnailSrc2}" class="thumbnail" onclick="openModal('${modalUrl2}')">` : ''; 
          
          let displayDate = row.Date || '';
          // แก้ปัญหาวันที่ปี 3111
          try {
             if (displayDate.includes('T') && displayDate.includes('Z')) {
                 let d = new Date(displayDate);
                 if (d.getFullYear() > 2400) { d.setFullYear(d.getFullYear() - 543); }
                 displayDate = d.toLocaleString('th-TH');
             }
          } catch(e) {}
          
          const rowIndex = row['RowIndex'] || 'N/A';
          tr.innerHTML = `
            <td>${displayDate}</td>
            <td>${row['Part No'] || ''}</td>
            <td>${row['Part Name'] || ''}</td>
            <td>${row.Problem || ''}</td>
            <td>${row.Issue || ''}</td>
            <td>${row.Recorder || ''}</td>
            <td>${row.Causer || ''}</td>
            <td>${imgTag1}</td>
            <td>${imgTag2}</td> 
            <td><button class="delete-btn" onclick="deleteRow(${rowIndex}, '${sheetName}')">Delete</button></td>
          `;
          tbody.appendChild(tr);
    });

    // อัปเดตปุ่มกด
    updatePaginationControls();
}

// 3. ฟังก์ชันอัปเดตสถานะปุ่มและเลขหน้า
function updatePaginationControls() {
    const pageIndicator = document.getElementById('pageIndicator');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    
    const totalPages = Math.ceil(allTableData.length / rowsPerPage) || 1;
    
    if(pageIndicator) pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    
    if(btnPrev) btnPrev.disabled = (currentPage === 1);
    if(btnNext) btnNext.disabled = (currentPage === totalPages) || (totalPages === 0);
}

// 4. ฟังก์ชันเปลี่ยนหน้า (กดปุ่ม)
function changePage(step) {
    const totalPages = Math.ceil(allTableData.length / rowsPerPage) || 1;
    const newPage = currentPage + step;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderTable(); 
    }
}

// ==========================================

// *** Load Chart & Ranking ***
function loadChartData() {
  const fromDateValue = document.getElementById('chartFromDate').value;
  const toDateValue = document.getElementById('chartToDate').value;
  
  const sheets = [
      { name: 'Audit LG1', chartId: 'problemChartLG1' },
      { name: 'Audit LG2', chartId: 'problemChartLG2' },
      { name: 'Audit S1', chartId: 'problemChartS1' },
      { name: 'Audit S2', chartId: 'problemChartS2' },
      { name: 'Audit SP', chartId: 'problemChartSP' }
  ];

  const promises = sheets.map(sheet => {
      return fetch(`${scriptURL}?sheet=${encodeURIComponent(sheet.name)}`)
        .then(response => response.json())
        .then(data => {
            const filtered = filterByDate(data, fromDateValue, toDateValue);
            return {
                sheetName: sheet.name,
                chartId: sheet.chartId,
                data: filtered
            };
        })
        .catch(err => {
            return { sheetName: sheet.name, chartId: sheet.chartId, data: [] };
        });
  });

  Promise.all(promises).then(results => {
      let allProblems = []; 
      results.forEach(result => {
          const counts = countProblems(result.data);
          renderChart(counts, result.chartId);
          result.data.forEach(row => { if (row.Problem) allProblems.push(row.Problem); });
      });
      renderRankingTable(allProblems);
  });
}

function filterByDate(data, fromDateValue, toDateValue) {
    if (!fromDateValue && !toDateValue) return data;
    const fromDate = fromDateValue ? new Date(fromDateValue) : null;
    const toDate = toDateValue ? new Date(toDateValue) : null;
    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) { toDate.setDate(toDate.getDate() + 1); toDate.setHours(0, 0, 0, -1); }

    return data.filter(row => {
        let dateObj = null;
        const rowDateStr = row.Date?.split(',')[0]?.trim() || ''; 
        if (row.Date && row.Date.includes('T') && row.Date.includes('Z')) {
            dateObj = new Date(row.Date);
            if (dateObj.getFullYear() > 2400) dateObj.setFullYear(dateObj.getFullYear() - 543);
        } else {
            const dateParts = rowDateStr.split('/');
            if (dateParts.length === 3) {
                let year = parseInt(dateParts[2]);
                if (year > 2400) year -= 543;
                dateObj = new Date(`${year}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`); 
            } else { dateObj = new Date(row.Date); }
        }
        if (isNaN(dateObj.getTime())) return false;
        dateObj.setHours(0, 0, 0, 0);
        if (fromDate && dateObj < fromDate) return false;
        if (toDate && dateObj > toDate) return false;
        return true;
    });
}

function countProblems(data) {
    const counts = {};
    data.forEach(row => { if (row.Problem) counts[row.Problem] = (counts[row.Problem] || 0) + 1; });
    return counts;
}

function renderRankingTable(allProblems) {
    const tableBody = document.querySelector('#summaryRankingTable tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    if (allProblems.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px; color: gray;">ไม่พบข้อมูลในช่วงเวลานี้</td></tr>';
        return;
    }
    const counts = {};
    allProblems.forEach(p => counts[p] = (counts[p] || 0) + 1);
    const totalCount = allProblems.length;
    const sortedProblems = Object.keys(counts).map(problem => {
        return { name: problem, count: counts[problem], percent: (counts[problem] / totalCount) * 100 };
    }).sort((a, b) => b.count - a.count);

    sortedProblems.forEach((item, index) => {
        const tr = document.createElement('tr');
        let rankIcon = index === 0 ? '🥇 ' : index === 1 ? '🥈 ' : index === 2 ? '🥉 ' : '&nbsp;&nbsp;&nbsp;&nbsp;';
        const barColor = ['#dc3545', '#fd7e14', '#ffc107', '#28a745', '#17a2b8'][index % 5];
        tr.innerHTML = `
            <td style="text-align: center; font-weight: bold; font-size: 1.1em; border-bottom: 1px solid #eee; padding: 12px;">${rankIcon}${index + 1}</td>
            <td style="font-weight: 500; border-bottom: 1px solid #eee; padding: 12px;">${item.name}</td>
            <td style="text-align: center; border-bottom: 1px solid #eee; padding: 12px;">${item.count}</td>
            <td style="text-align: center; border-bottom: 1px solid #eee; padding: 12px;">
                <div style="background-color: #f1f3f5; border-radius: 4px; overflow: hidden; width: 90%; margin: auto; height: 22px; position: relative; border: 1px solid #e9ecef;">
                    <div style="background-color: ${barColor}; width: ${item.percent}%; height: 100%;"></div>
                    <span style="position: absolute; top: 0; left: 0; width: 100%; text-align: center; font-size: 12px; line-height: 22px; color: #444; font-weight: bold;">${item.percent.toFixed(1)}%</span>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function renderChart(problemCounts, chartId) {
  const ctx = document.getElementById(chartId);
  if (!ctx) return;
  let existingChart = Chart.getChart(ctx);
  if (existingChart) existingChart.destroy();
  let parentWrapper = ctx.parentElement;
  if (Object.keys(problemCounts).length === 0) {
    ctx.style.display = 'none';
    let placeholder = parentWrapper.querySelector('.no-data-placeholder');
    if (!placeholder) {
        placeholder = document.createElement('p');
        placeholder.className = 'no-data-placeholder';
        placeholder.style.color = 'gray';
        placeholder.style.textAlign = 'center';
        placeholder.style.width = '100%';
        placeholder.textContent = `ไม่มีข้อมูล`;
        parentWrapper.appendChild(placeholder);
    }
    return;
  } else {
    ctx.style.display = 'block';
    const placeholder = parentWrapper.querySelector('.no-data-placeholder');
    if (placeholder) placeholder.remove();
  }
  const colors = Object.keys(problemCounts).map((_, i) => `hsl(${i * 40 % 360}, 70%, 60%)`);
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(problemCounts),
      datasets: [{ label: 'จำนวนปัญหา', data: Object.values(problemCounts), backgroundColor: colors }]
    },
    options: {
      responsive: false, maintainAspectRatio: false,
      plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 12, padding: 10 } }, title: { display: false } }
    }
  });
}

function openModal(src) {
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImage");
  const fullSizeLink = document.getElementById("fullSizeLink"); 
  modal.style.display = "flex"; 
  modalImg.src = src;
  if(fullSizeLink) fullSizeLink.href = src;
}
function closeModal() { document.getElementById("imageModal").style.display = "none"; }
function showToast() {
    const toast = document.getElementById("toastNotification");
    if (!toast) return; 
    toast.classList.remove("toast-hidden");
    setTimeout(() => toast.classList.add("toast-visible"), 50); 
    setTimeout(function(){ 
        toast.classList.remove("toast-visible");
        toast.classList.add("toast-hidden");
    }, 3000); 
}
function exportToExcel() {
  const table = document.getElementById('auditTable');
  if (typeof XLSX === 'undefined') { alert('ไม่พบไลบรารี XLSX'); return; }
  const ws = XLSX.utils.table_to_sheet(table);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Audit");
  XLSX.writeFile(wb, "audit_export.xlsx");
}