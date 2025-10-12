document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    const loadDefaultBtn = document.getElementById('loadDefaultBtn');
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const generateScheduleBtn = document.getElementById('generateScheduleBtn');
    const allocateSeatsBtn = document.getElementById('allocateSeatsBtn');
    const searchBtn = document.getElementById('searchBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');

    const filterDept = document.getElementById('filterDept');
    const filterSem = document.getElementById('filterSem');
    const filterDiv = document.getElementById('filterDiv');
    const scheduleDeptSelect = document.getElementById('scheduleDept');
    const scheduleSemSelect = document.getElementById('scheduleSem');
    const examDaySelect = document.getElementById('examDay');
    const searchQueryInput = document.getElementById('searchQuery');

    const scheduleOutput = document.getElementById('scheduleOutput');
    const seatingOutput = document.getElementById('seatingOutput');
    const searchResults = document.getElementById('searchResults');
    const performanceMetrics = document.getElementById('performanceMetrics');
    const filteredStudentsList = document.getElementById('filteredStudentsList');

    const studentCountEl = document.getElementById('studentCount');
    const hallCountEl = document.getElementById('hallCount');
    const profCountEl = document.getElementById('profCount');
    const subjectCountEl = document.getElementById('subjectCount');

    const seatingDeptSelect = document.getElementById('seatingDept');
    const seatingSemSelect = document.getElementById('seatingSem');
    const seatingSubjectSelect = document.getElementById('seatingSubject');

    // ✅ PDF Button (may not exist on initial load — check first)
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');

    // Global Data
    let students = [];
    let halls = [];
    let professors = [];
    const semesterSchedules = {};

    // Initialize
    initializeDefaultDataset();
    updateStats();
    renderFilteredStudents(students.slice(0, 50));

    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    // Load Default Dataset
    loadDefaultBtn.addEventListener('click', () => {
        initializeDefaultDataset();
        updateStats();
        renderFilteredStudents(students.slice(0, 50));
        filterDept.value = "";
        filterSem.value = "";
        filterDiv.value = "";
        if (downloadPdfBtn) downloadPdfBtn.style.display = 'none';
        alert('✅ Loaded default dataset (960 students)');
    });

    // Apply Filter
    applyFilterBtn.addEventListener('click', () => {
        const dept = filterDept.value;
        const sem = filterSem.value ? parseInt(filterSem.value) : null;
        const div = filterDiv.value;

        let filtered = [...students];
        if (dept) filtered = filtered.filter(s => s.dept === dept);
        if (sem !== null) filtered = filtered.filter(s => s.semester === sem);
        if (div) filtered = filtered.filter(s => s.division === div);

        renderFilteredStudents(filtered);
    });

    // Generate/Edit Schedule for ONE SEMESTER ONLY
    generateScheduleBtn.addEventListener('click', () => {
        const dept = scheduleDeptSelect.value;
        const sem = scheduleSemSelect.value;

        if (!dept || !sem) {
            scheduleOutput.innerHTML = '<p class="placeholder">Please select both department and semester.</p>';
            if (downloadPdfBtn) downloadPdfBtn.style.display = 'none';
            return;
        }

        const key = `${dept}-${sem}`;
        const subjects = getSubjectsForDept(dept)[parseInt(sem)] || [];

        if (subjects.length === 0) {
            scheduleOutput.innerHTML = '<p class="placeholder">No subjects found for this semester.</p>';
            if (downloadPdfBtn) downloadPdfBtn.style.display = 'none';
            return;
        }

        let html = `<h3 style="margin-bottom: 20px; color: var(--accent);">📅 Edit Exam Dates for ${dept} - Sem ${sem}</h3>`;
        html += '<div class="date-inputs-container">';

        subjects.forEach(subject => {
            const savedDate = semesterSchedules[key]?.[subject] || '';
            html += `
            <div class="date-input-row">
                <span class="date-input-label">${subject}</span>
                <input type="date" class="date-input" data-key="${key}" data-subject="${subject}" value="${savedDate}">
            </div>
        `;
        });

        html += `</div><br>
        <button id="saveSemesterDatesBtn" class="btn-primary">
            <i class="fas fa-save"></i> Save Dates for Sem ${sem}
        </button>`;

        scheduleOutput.innerHTML = html;

        // Re-attach save button listener (since innerHTML replaces DOM)
        document.getElementById('saveSemesterDatesBtn').onclick = () => {
            if (!semesterSchedules[key]) semesterSchedules[key] = {};
            subjects.forEach(subject => {
                const input = document.querySelector(`input[data-key="${key}"][data-subject="${subject}"]`);
                if (input) {
                    semesterSchedules[key][subject] = input.value;
                }
            });
            alert(`✅ Saved exam dates for ${dept} - Sem ${sem}`);

            // ✅ AUTO-SHOW SCHEDULE TABLE + PDF BUTTON
            const schedule = semesterSchedules[key] || {};
            const dateSubjectMap = {};
            for (const [sub, date] of Object.entries(schedule)) {
                if (date) {
                    if (!dateSubjectMap[date]) dateSubjectMap[date] = [];
                    dateSubjectMap[date].push(sub);
                }
            }

            const sortedDates = Object.keys(dateSubjectMap).sort();
            if (sortedDates.length === 0) {
                scheduleOutput.innerHTML = '<p class="placeholder">No dates saved yet.</p>';
                if (downloadPdfBtn) downloadPdfBtn.style.display = 'none';
                return;
            }

            let tableHtml = `
                <div class="schedule-table-container">
                    <table class="schedule-table">
                        <thead>
                            <tr>
                                <th>Day</th>
                                <th>Date</th>
                                <th>Subject(s)</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            sortedDates.forEach((date, i) => {
                const subjectsList = dateSubjectMap[date].join(', ');
                const displayDate = new Date(date).toLocaleDateString('en-GB');
                tableHtml += `
                    <tr>
                        <td><strong>Day ${i + 1}</strong></td>
                        <td>${displayDate}</td>
                        <td>${subjectsList}</td>
                    </tr>
                `;
            });

            tableHtml += `
                        </tbody>
                    </table>
                </div>
            `;

            scheduleOutput.innerHTML = tableHtml;
            if (downloadPdfBtn) {
                downloadPdfBtn.style.display = 'inline-block';
            }
        };
    });

    // When department or semester changes in Seating tab, update subject list
    seatingDeptSelect.addEventListener('change', updateSeatingSubjects);
    seatingSemSelect.addEventListener('change', updateSeatingSubjects);

    function updateSeatingSubjects() {
        const dept = seatingDeptSelect.value;
        const sem = seatingSemSelect.value;
        const subjectSelect = seatingSubjectSelect;

        // Clear dropdown
        subjectSelect.innerHTML = '<option value="">Select Subject</option>';

        if (!dept || !sem) return;

        // Get subjects for this department and semester
        const subjects = getSubjectsForDept(dept)[parseInt(sem)] || [];

        if (subjects.length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No subjects defined for this semester";
            option.disabled = true;
            subjectSelect.appendChild(option);
            return;
        }

        // Add each subject to dropdown
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });
    }

    // Allocate Seats — By Subject (Manual Selection Only)
    allocateSeatsBtn.addEventListener('click', () => {
        const dept = seatingDeptSelect.value;
        const sem = seatingSemSelect.value;
        const subject = seatingSubjectSelect.value;

        if (!dept || !sem || !subject) {
            seatingOutput.innerHTML = '<p class="placeholder">Please select department, semester, and subject.</p>';
            return;
        }

        // Get all students taking this subject in this department/semester
        const studentsForSubject = students.filter(s =>
            s.dept === dept &&
            s.semester === parseInt(sem) &&
            s.subjects.includes(subject)
        );

        if (studentsForSubject.length === 0) {
            seatingOutput.innerHTML = `<p class="placeholder">No students found for ${subject} in ${dept} Sem ${sem}.</p>`;
            return;
        }

        // Allocate to halls sequentially
        const allocation = {};
        const sortedHalls = [...halls].sort((a, b) => a.name.localeCompare(b.name));
        let hallIndex = 0;
        let i = 0;

        while (i < studentsForSubject.length && hallIndex < sortedHalls.length) {
            const hall = sortedHalls[hallIndex];
            if (!allocation[hall.name]) {
                allocation[hall.name] = { subject, students: [] };
            }

            const space = hall.capacity - allocation[hall.name].students.length;
            const toAssign = studentsForSubject.slice(i, i + space);
            allocation[hall.name].students.push(...toAssign);

            i += space;
            if (allocation[hall.name].students.length >= hall.capacity) {
                hallIndex++;
            }
        }

        // Render output
        let html = '';
        for (const [hallName, data] of Object.entries(allocation)) {
            html += `<h3 style="color: var(--accent); margin: 25px 0 15px 0;">🏫 ${hallName} → <strong>${data.subject}</strong> (${data.students.length}/${halls.find(h => h.name === hallName)?.capacity || 0})</h3>`;
            data.students.forEach(student => {
                html += `
                <div class="seat-card">
                    <div class="roll">${student.roll}</div>
                    <div class="name">${student.name}</div>
                    <div style="font-size: 0.8rem; color: var(--gray);">${student.dept}-Sem${student.semester}-${student.division}</div>
                </div>
            `;
            });

            const hallIndexProf = halls.findIndex(h => h.name === hallName);
            if (professors.length > 0) {
                const prof = professors[hallIndexProf % professors.length];
                html += `<p style="margin-top: 15px; color: var(--success);"><i class="fas fa-chalkboard-teacher"></i> Invigilator: ${prof}</p>`;
            }
        }

        seatingOutput.innerHTML = html || '<p class="placeholder">No students allocated.</p>';
    });

    // Search Students
    searchBtn.addEventListener('click', () => {
        const query = searchQueryInput.value.trim().toLowerCase();
        if (!query) {
            searchResults.innerHTML = '<p class="placeholder">Please enter a search term.</p>';
            return;
        }

        const results = students.filter(student =>
            student.name.toLowerCase().includes(query) ||
            student.roll.toLowerCase().includes(query) ||
            student.id.toLowerCase().includes(query)
        );

        if (results.length === 0) {
            searchResults.innerHTML = '<p class="placeholder">No students found.</p>';
            return;
        }

        let html = `<p>Found ${results.length} student(s):</p>`;
        results.forEach(student => {
            html += `
                <div class="search-result-item">
                    <strong>${student.name}</strong> (${student.roll})<br>
                    <small>ID: ${student.id} | ${student.dept}-Sem${student.semester}-${student.division}</small><br>
                    <small>Subjects: ${student.subjects.join(', ')}</small>
                </div>
            `;
        });

        searchResults.innerHTML = html;
    });

    // Analyze Performance
    analyzeBtn.addEventListener('click', () => {
        const n = students.length;
        const m = halls.length;
        const s = new Set();
        students.forEach(st => st.subjects.forEach(s.add, s));
        const metrics = {
            seatingComplexity: `O(n × m) = O(${n} × ${m})`,
            schedulingComplexity: `O(1) per semester`,
            searchComplexity: `O(n × len)`,
            spaceComplexity: `O(n + m + ${s.size})`,
            subjectCount: s.size
        };

        let html = `
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                <div style="background: rgba(76, 201, 240, 0.1); padding: 20px; border-radius: 15px;">
                    <h4>⏱️ Time Complexity</h4>
                    <p><strong>Seating Allocation:</strong> ${metrics.seatingComplexity}</p>
                    <p><strong>Schedule Generation:</strong> ${metrics.schedulingComplexity}</p>
                    <p><strong>Student Search:</strong> ${metrics.searchComplexity}</p>
                </div>
                <div style="background: rgba(67, 97, 238, 0.1); padding: 20px; border-radius: 15px;">
                    <h4>💾 Space Complexity</h4>
                    <p>${metrics.spaceComplexity}</p>
                    <h4 style="color: #fbbf24; margin-top: 20px;">📊 Dataset Size</h4>
                    <p>Students: ${n.toLocaleString()}</p>
                    <p>Halls: ${m}</p>
                    <p>Professors: ${professors.length}</p>
                    <p>Subjects: ${metrics.subjectCount}</p>
                </div>
            </div>
            <div style="margin-top: 30px; background: rgba(251, 191, 36, 0.1); padding: 20px; border-radius: 15px; border-left: 4px solid #fbbf24;">
                <h4>🧩 Algorithmic Approach</h4>
                <p><strong>Seating:</strong> Greedy Bin Packing (Fill Hall 1 → Hall 2)</p>
                <p><strong>Scheduling:</strong> Teacher-Defined Dates per Semester</p>
                <p><strong>Search:</strong> Linear String Matching</p>
                <p><strong>NP-Completeness:</strong> Perfect conflict-free seating = Graph Coloring → NP-Complete → Heuristics used</p>
            </div>
        `;
        performanceMetrics.innerHTML = html;
    });

    // Helper Functions
    function initializeDefaultDataset() {
        const depts = ["CSE", "IT", "Mechanical", "Civil", "Electrical"];
        const divisions = ["A", "B", "C", "D"];

        students = [];
        let id = 1;
        for (const dept of depts) {
            for (let sem = 1; sem <= 8; sem++) {
                for (const div of divisions) {
                    for (let i = 1; i <= 15; i++) {
                        students.push({
                            id: `STU${String(id).padStart(5, '0')}`,
                            name: `${getRandomName()} ${getRandomLastName()}`,
                            roll: `${dept}/Sem${sem}/${div}/${i}`,
                            dept,
                            semester: sem,
                            division: div,
                            subjects: getSubjectsForDept(dept)[sem] || []
                        });
                        id++;
                    }
                }
            }
        }

        halls = [];
        for (let i = 1; i <= 20; i++) {
            halls.push({
                name: `Hall_${String(i).padStart(3, '0')}`,
                capacity: 40
            });
        }

        professors = [];
        const firstNames = ["Dr. Smith", "Prof. Johnson", "Dr. Williams", "Prof. Brown", "Dr. Jones"];
        const lastNames = ["Patel", "Sharma", "Kumar", "Singh", "Gupta"];
        for (let i = 1; i <= 30; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            professors.push(`${firstName} ${lastName}`);
        }
    }

    function getSubjectsForDept(dept) {
        const deptSubjects = {
            "CSE": {
                1: ["BME", "Physics", "Math-I", "Workshop", "Engg Drawing", "EVS"],
                2: ["DSA", "COA", "Math-III", "Digital Logic", "OOPs", "Java"],
                3: ["DBMS", "OS", "CN", "TOC", "SE", "Elective-I"],
                4: ["AI", "ML", "Cloud", "Cybersecurity", "Elective-II", "Project-I"],
                5: ["Blockchain", "Big Data", "IoT", "Elective-III", "Project-II"],
                6: ["Distributed Systems", "Mobile Computing", "Elective-IV", "Project-III"],
                7: ["Internship", "Elective-V", "Soft Skills", "Ethics"],
                8: ["Viva", "Elective-VI", "Research", "Seminar"]
            },
            "IT": {
                1: ["BME", "Physics", "Math-I", "Workshop", "Engg Drawing", "EVS"],
                2: ["DSA", "COA", "Math-III", "Web Tech", "OOPs", "PHP"],
                3: ["DBMS", "OS", "CN", "Java", "SE", "Elective-I"],
                4: ["AI", "ML", "Cloud", "Cybersecurity", "Elective-II", "Project-I"],
                5: ["Blockchain", "Big Data", "IoT", "Elective-III", "Project-II"],
                6: ["Distributed Systems", "Mobile Computing", "Elective-IV", "Project-III"],
                7: ["Internship", "Elective-V", "Soft Skills", "Ethics"],
                8: ["Viva", "Elective-VI", "Research", "Seminar"]
            },
            "Mechanical": {
                1: ["BME", "Physics", "Math-I", "Workshop", "Engg Drawing", "EVS"],
                2: ["Thermo", "FM", "Materials", "CAD", "Mechanics", "Elective"],
                3: ["Heat Transfer", "Dynamics", "Design", "Lab", "Elective"],
                4: ["Fluid Mech", "Machines", "Control", "PSD", "SE"],
                5: ["Automobile", "Robotics", "Project", "Elective-I", "Elective-II"],
                6: ["CFD", "FEM", "Project-II", "Elective-III"],
                7: ["Internship", "Elective-IV", "Soft Skills", "Ethics"],
                8: ["Viva", "Elective-V", "Research", "Seminar"]
            },
            "Civil": {
                1: ["BME", "Physics", "Math-I", "Workshop", "Engg Drawing", "EVS"],
                2: ["Strength", "FM", "Survey", "Geotech", "Materials", "Elective"],
                3: ["Structures", "Hydraulics", "Transport", "Design", "Lab"],
                4: ["Earthquake", "Smart Cities", "Project", "Elective-I", "Elective-II"],
                5: ["Management", "Enviro", "Project-II", "Elective-III"],
                6: ["Elective-IV", "Elective-V", "Project-III"],
                7: ["Internship", "Elective-VI", "Soft Skills", "Ethics"],
                8: ["Viva", "Elective-VII", "Research", "Seminar"]
            },
            "Electrical": {
                1: ["BME", "Physics", "Math-I", "Workshop", "Engg Drawing", "EVS"],
                2: ["Circuits", "Machines", "Control", "PSD", "SE"],
                3: ["Power Sys", "Drives", "IoT", "Elective-I", "Elective-II"],
                4: ["Renewables", "Smart Grid", "Project", "Elective-III"],
                5: ["Project-II", "Elective-IV", "Elective-V"],
                6: ["Elective-VI", "Elective-VII", "Project-III"],
                7: ["Internship", "Elective-VIII", "Soft Skills", "Ethics"],
                8: ["Viva", "Elective-IX", "Research", "Seminar"]
            }
        };
        return deptSubjects[dept] || {};
    }

    function updateStats() {
        studentCountEl.textContent = students.length.toLocaleString();
        hallCountEl.textContent = halls.length;
        profCountEl.textContent = professors.length;
        let totalSubjects = 0;
        const allSubjects = getSubjectsForDept("CSE");
        for (const sem in allSubjects) {
            totalSubjects += allSubjects[sem].length;
        }
        subjectCountEl.textContent = totalSubjects;
    }

    function renderFilteredStudents(studentList) {
        if (studentList.length === 0) {
            filteredStudentsList.innerHTML = '<p class="placeholder">No students match your filter.</p>';
            return;
        }

        filteredStudentsList.innerHTML = '';
        studentList.slice(0, 50).forEach(student => {
            const div = document.createElement('div');
            div.className = 'data-item';
            div.innerHTML = `
                <div>
                    <strong>${student.name}</strong><br>
                    <small>${student.roll} | ${student.dept}-Sem${student.semester}-${student.division}</small>
                </div>
            `;
            filteredStudentsList.appendChild(div);
        });

        if (studentList.length > 50) {
            const moreDiv = document.createElement('div');
            moreDiv.style.color = 'var(--accent)';
            moreDiv.style.textAlign = 'center';
            moreDiv.style.padding = '10px';
            moreDiv.textContent = `+ ${studentList.length - 50} more students...`;
            filteredStudentsList.appendChild(moreDiv);
        }
    }

    function getRandomName() {
        const names = ["Aarav", "Vihaan", "Aditya", "Arjun", "Reyansh", "Ananya", "Aadhya", "Diya", "Pari", "Anika"];
        return names[Math.floor(Math.random() * names.length)];
    }

    function getRandomLastName() {
        const names = ["Patel", "Sharma", "Kumar", "Singh", "Gupta", "Mishra", "Verma", "Yadav", "Joshi", "Pandey"];
        return names[Math.floor(Math.random() * names.length)];
    }

    // ✅ Download Schedule as PDF (only if button exists)
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', () => {
            const dept = scheduleDeptSelect.value;
            const sem = scheduleSemSelect.value;
            if (!dept || !sem) return;

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Title
            doc.setFontSize(18);
            doc.text(`Exam Schedule: ${dept} - Semester ${sem}`, 14, 20);
            doc.setFontSize(12);
            doc.text('Generated by AI-Based Exam Seating System', 14, 27);

            // Table data
            const schedule = semesterSchedules[`${dept}-${sem}`] || {};
            const entries = [];

            for (const [subject, date] of Object.entries(schedule)) {
                if (date) {
                    entries.push({ date, subject });
                }
            }

            if (entries.length === 0) {
                doc.text("No schedule available.", 14, 40);
            } else {
                // Sort by date
                entries.sort((a, b) => new Date(a.date) - new Date(b.date));

                let y = 45;
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('Day', 14, y);
                doc.text('Date', 50, y);
                doc.text('Subject', 90, y);
                doc.setFont('helvetica', 'normal');

                y += 8;
                entries.forEach((entry, i) => {
                    const displayDate = new Date(entry.date).toLocaleDateString('en-GB');
                    doc.text(`Day ${i + 1}`, 14, y);
                    doc.text(displayDate, 50, y);
                    doc.text(entry.subject, 90, y);
                    y += 7;
                });
            }

            doc.save(`Exam_Schedule_${dept}_Sem${sem}.pdf`);
        });
    }
});