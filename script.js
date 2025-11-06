// Firebase App (the core Firebase SDK) is always required and must be listed first
// These scripts should be included in index.html:
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js"></script>


const firebaseConfig = {
  apiKey: "AIzaSyCDMuXBnwNtHS45mr2NaGwzJmIcFeCns4M",
  authDomain: "user-cc860.firebaseapp.com",
  projectId: "user-cc860",
  storageBucket: "user-cc860.appspot.com",
  messagingSenderId: "415059100394",
  appId: "1:415059100394:web:c8e03e6d340a4eca8a0d93",
  measurementId: "G-7WV328Z27C"
};
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();

// ตัวแปรสำหรับ Debounce (แก้ปัญหาข้อมูลหาย)
let debounceTimer; 


// *** ฟังก์ชันช่วย: ดึง File ID จาก URL (ใช้ได้กับรูปแบบ /preview ที่ Apps Script บันทึก) ***
const getFileIdFromUrl = (url) => {
    if (!url) return null;
    // URL ที่ Apps Script บันทึก: https://drive.google.com/file/d/[ID]/preview
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
};


// *** ฟังก์ชันใหม่: จัดการการหน่วงเวลา ***
function debouncedLoadData() {
    clearTimeout(debounceTimer); 
    debounceTimer = setTimeout(loadData, 300); 
}
// **********************************

// *** ฟังก์ชันใหม่: ปรับ URL ให้ดึงภาพขนาดเต็มสำหรับ Modal ***
const getFullSizeUrl = (url) => {
    const fileId = getFileIdFromUrl(url); 
    if (!fileId) return '';
    // ใช้ Direct Download link สำหรับ Modal (รูปขนาดเต็ม)
    return `https://drive.google.com/uc?export=download&id=${fileId}`; 
};
// ********************************************************


// Login and Logout functions
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      document.getElementById("loginSection").style.display = "none";
      document.getElementById("mainApp").style.display = "block";
      debouncedLoadData(); 
      loadChartData(); 
      showToast(); 
    })
    .catch(error => alert("Login failed: " + error.message));
}

function logout() {
  auth.signOut().then(() => { 
    document.getElementById("loginSection").style.display = "block";
    document.getElementById("mainApp").style.display = "none";
  });
}


const scriptURL = "https://script.google.com/macros/s/AKfycbw-vAABeSggmLVfZvprsQtvjqDLn-ehod963pTRpBHovKoiHYQAD6UHl4PU1lCTunKt/exec";

function showSection(id) {
  document.querySelectorAll('.nav-left button').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`btn${id.charAt(0).toUpperCase() + id.slice(1)}`).classList.add('active'); 
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'table') debouncedLoadData(); 
  if (id === 'chart') loadChartData(); 
}

document.getElementById('auditForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const partNo = document.getElementById("partNo").value;
  const partName = document.getElementById("partName").value;
  const problem = document.getElementById("problem").value;
  const issue = document.getElementById("issue").value;
  const recorder = document.getElementById("recorder").value;
  const causer = document.getElementById("causer").value;
  const docType = document.getElementById("docType").value;
  const date = new Date().toLocaleString('th-TH');

  const imageInput1 = document.getElementById("imageInput1"); 
  const imageInput2 = document.getElementById("imageInput2"); 
  
  const file1 = imageInput1 ? imageInput1.files[0] : null;
  const file2 = imageInput2 ? imageInput2.files[0] : null;

  const readFile = (file) => new Promise((resolve) => {
    if (!file) {
        resolve(null); 
        return;
    }
    const reader = new FileReader();
    reader.onload = function() {
      resolve(reader.result); 
    };
    reader.readAsDataURL(file);
  });
  
  Promise.all([readFile(file1), readFile(file2)]).then(results => {
    const imageData1 = results[0];
    const imageData2 = results[1];

    sendToGoogleSheets({ date, partNo, partName, problem, issue, recorder, causer, imageData1, imageData2, docType });
  });
});

function sendToGoogleSheets(record) {
  const payload = {
    date: record.date,
    partNo: record.partNo,
    partName: record.partName,
    problem: record.problem,
    issue: record.issue,
    recorder: record.recorder,
    causer: record.causer,
    imageData1: record.imageData1, 
    imageData2: record.imageData2, 
    docType: record.docType
  };
  
  fetch(scriptURL, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify(payload), 
  }).then(() => {
    alert('บันทึกข้อมูลเรียบร้อย');
    document.getElementById('auditForm').reset(); 
    if (document.getElementById('table').classList.contains('active')) {
      debouncedLoadData();
    }
  }).catch(error => console.error('Error:', error));
}

function loadData() {
    const sheetName = document.getElementById('sheetSelector')?.value || 'Audit LG1';
    const fromDateValue = document.getElementById('fromDate').value;
    const toDateValue = document.getElementById('toDate').value;
    
    fetch(`${scriptURL}?sheet=${encodeURIComponent(sheetName)}`)
      .then(response => response.json())
      .then(data => {
        const tbody = document.querySelector('#auditTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        let filteredData = data;

        if (fromDateValue || toDateValue) {
          filteredData = data.filter(row => {
            const rowDateStr = row.Date?.split(',')[0]?.trim() || ''; 
            const dateParts = rowDateStr.split('/');
            
            let dateObj = null;
            if (dateParts.length === 3) {
              dateObj = new Date(`${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`); 
            } else {
              dateObj = new Date(row.Date);
            }
            
            if (isNaN(dateObj.getTime())) return false;

            let passFrom = true;
            let passTo = true;

            if (fromDateValue) {
              const fromDate = new Date(fromDateValue);
              fromDate.setHours(0, 0, 0, 0); 
              dateObj.setHours(0, 0, 0, 0); 
              passFrom = dateObj >= fromDate;
            }

            if (toDateValue) {
              const toDate = new Date(toDateValue);
              toDate.setDate(toDate.getDate() + 1);
              toDate.setHours(0, 0, 0, -1);
              passTo = dateObj <= toDate;
            }
            
            return passFrom && passTo;
          });
        }

        filteredData.forEach(row => {
          const tr = document.createElement('tr');
          const partNo = row['Part No'] || ''; 
          const partName = row['Part Name'] || '';
          
          const image1Url = row['Image 1'] || ''; 
          const image2Url = row['Image 2'] || ''; 
          
          // *** ดึง File ID เพื่อใช้งาน URL ที่เสถียรที่สุด ***
          const fileId1 = getFileIdFromUrl(image1Url);
          const fileId2 = getFileIdFromUrl(image2Url);
          
          const modalUrl1 = getFullSizeUrl(image1Url);
          const modalUrl2 = getFullSizeUrl(image2Url);

          // *** THUMBNAIL: ใช้รูปแบบ /thumbnail?id=... สำหรับแสดงผลในตาราง 80x80px ***
          const thumbnailSrc1 = fileId1 ? `https://drive.google.com/thumbnail?id=${fileId1}&sz=w80-h80` : ''; 
          const thumbnailSrc2 = fileId2 ? `https://drive.google.com/thumbnail?id=${fileId2}&sz=w80-h80` : '';

          // ใช้ thumbnailSrc ใน img tag
          const imgTag1 = thumbnailSrc1 ? `<img src=\"${thumbnailSrc1}\" class=\"thumbnail\" onclick=\"openModal('${modalUrl1}')\">` : ''; 
          const imgTag2 = thumbnailSrc2 ? `<img src=\"${thumbnailSrc2}\" class=\"thumbnail\" onclick=\"openModal('${modalUrl2}')\">` : ''; 
          
          let displayDate = row.Date || '';
          try {
              if (displayDate.includes('T') && displayDate.includes('Z')) {
                  const dateObj = new Date(displayDate);
                  
                  const timezoneOffsetInMinutes = dateObj.getTimezoneOffset(); 
                  const thaiOffsetInMinutes = 7 * 60; 
                  const totalAdjustment = timezoneOffsetInMinutes + thaiOffsetInMinutes;

                  dateObj.setMinutes(dateObj.getMinutes() + totalAdjustment);

                  const day = String(dateObj.getDate()).padStart(2, '0');
                  const month = String(dateObj.getMonth() + 1).padStart(2, '0'); 
                  const yearCE = dateObj.getFullYear(); 
                  
                  const hours = String(dateObj.getHours()).padStart(2, '0');
                  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                  const seconds = String(dateObj.getSeconds()).padStart(2, '0');

                  displayDate = `${day}/${month}/${yearCE} ${hours}:${minutes}:${seconds}`;
              }
          } catch (e) {
              console.error("Error formatting date:", e);
          }
          
          tr.innerHTML = `
            <td>${displayDate}</td>
            <td>${partNo}</td>
            <td>${partName}</td>
            <td>${row.Problem || ''}</td>
            <td>${row.Issue || ''}</td>
            <td>${row.Recorder || ''}</td>
            <td>${row.Causer || ''}</td>
            <td>${imgTag1}</td>
            <td>${imgTag2}</td> `;
          tbody.appendChild(tr);
        });

      }) 
      .catch(error => console.error('Error loading data:', error));
}


function loadChartData() {
  const fromDateValue = document.getElementById('chartFromDate').value;
  const toDateValue = document.getElementById('chartToDate').value;
  
  fetch(`${scriptURL}?sheet=Audit LG1`)
    .then(response => response.json())
    .then(data => {
      const countsLG1 = filterAndCountProblems(data, fromDateValue, toDateValue);
      renderChart(countsLG1, 'problemChartLG1', 'Audit LG1');
    });

  fetch(`${scriptURL}?sheet=Audit LG2`)
    .then(response => response.json())
    .then(data => {
      const countsLG2 = filterAndCountProblems(data, fromDateValue, toDateValue);
      renderChart(countsLG2, 'problemChartLG2', 'Audit LG2');
    });
}

function filterAndCountProblems(data, fromDateValue, toDateValue) {
    const counts = {};
    const fromDate = fromDateValue ? new Date(fromDateValue) : null;
    const toDate = toDateValue ? new Date(toDateValue) : null;
    
    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) {
      toDate.setDate(toDate.getDate() + 1);
      toDate.setHours(0, 0, 0, -1);
    }

    data.forEach(row => {
        let isWithinDateRange = true;
        
        let dateObj = null;
        const rowDateStr = row.Date?.split(',')[0]?.trim() || ''; 
        const dateParts = rowDateStr.split('/');
          
        if (dateParts.length === 3) {
            dateObj = new Date(`${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`); 
        } else {
            dateObj = new Date(row.Date);
        }

        if (isNaN(dateObj.getTime())) return;

        if (fromDateValue || toDateValue) {
            dateObj.setHours(0, 0, 0, 0);
            if (fromDate && dateObj < fromDate) isWithinDateRange = false;
            if (toDate && dateObj > toDate) isWithinDateRange = false; 
        }

        if (isWithinDateRange && row.Problem) {
            counts[row.Problem] = (counts[row.Problem] || 0) + 1;
        }
    });
    return counts;
}

// ฟังก์ชัน renderChart

function renderChart(problemCounts, chartId, chartTitle) {
  const ctx = document.getElementById(chartId)?.getContext('2d');
  if (!ctx) return;
  
  let existingChart = Chart.getChart(chartId);
  if (existingChart) {
    existingChart.destroy();
  }
  
  const canvas = document.getElementById(chartId);
  // จัดการเมื่อไม่มีข้อมูล
  if (Object.keys(problemCounts).length === 0) {
    if (canvas) {
        canvas.style.display = 'none';
        let placeholder = document.getElementById(`${chartId}-placeholder`);
        if (!placeholder) {
            placeholder = document.createElement('p');
            placeholder.id = `${chartId}-placeholder`;
            canvas.parentNode.insertBefore(placeholder, canvas.nextSibling);
        }
        placeholder.style.color = 'gray';
        placeholder.textContent = `ไม่มีข้อมูลสำหรับ ${chartTitle}`;
    }
    return;
  }
  
  // แสดง canvas
  if (canvas) {
    canvas.style.display = 'block';
    const placeholder = document.getElementById(`${chartId}-placeholder`);
    if (placeholder) placeholder.remove();
  }
  
  const colors = Object.keys(problemCounts).map((_, i) => `hsl(${i * 40 % 360}, 70%, 60%)`);
  
  // *** บังคับขนาด Width และ Height ที่นี่ (400x400) ***
  canvas.width = 400; 
  canvas.height = 400; 

  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(problemCounts),
      datasets: [{
        label: 'จำนวนปัญหา',
        data: Object.values(problemCounts),
        backgroundColor: colors
      }]
    },
    options: {
      responsive: false, // ปิด responsive
      maintainAspectRatio: false, // ปิด maintainAspectRatio
      aspectRatio: 1, // บังคับอัตราส่วน (แต่ใช้ width/height จะแน่นอนกว่า)
      plugins: {
        legend: { display: true },
        title: { display: true, text: chartTitle }
      }
    }
  });
}

function openModal(src) {
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImage");
  modal.style.display = "flex"; 
  modalImg.src = src;
}

function closeModal() {
  document.getElementById("imageModal").style.display = "none";
}

// ฟังก์ชัน Export Excel
function exportToExcel() {
  const table = document.getElementById('auditTable');
  
  if (typeof XLSX === 'undefined') {
    alert('ข้อผิดพลาด: ไม่พบไลบรารี XLSX (SheetJS) โปรดตรวจสอบการโหลดใน index.html');
    return;
  }
  
  const ws = XLSX.utils.table_to_sheet(table);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Audit");
  XLSX.writeFile(wb, "audit_export.xlsx");
}

// *** ฟังก์ชันใหม่: showToast() ***
function showToast() {
    const toast = document.getElementById("toastNotification");
    if (!toast) return; 

    toast.classList.remove("toast-hidden");
    
    setTimeout(() => {
        toast.classList.add("toast-visible");
    }, 50); 
    
    setTimeout(function(){ 
        toast.classList.remove("toast-visible");
        toast.classList.add("toast-hidden");
    }, 3000); 
}

// *** สิ้นสุดฟังก์ชัน showToast() ***