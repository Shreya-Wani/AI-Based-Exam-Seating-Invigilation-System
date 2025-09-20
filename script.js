document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    const loadDefaultBtn = document.getElementById('loadDefaultBtn');
    const loadLargeBtn = document.getElementById('loadLargeBtn');
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const generateScheduleBtn = document.getElementById('generateScheduleBtn');
    const allocateSeatsBtn = document.getElementById('allocateSeatsBtn');
    const searchBtn = document.getElementById('searchBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');

    const filterDept = document.getElementById('filterDept');
    const filterYear = document.getElementById('filterYear');
    const filterDiv = document.getElementById('filterDiv');
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

    // ✅ Store filtered students globally
    let currentFilteredStudents = [];

    // Global Data
    let students = [];
    let halls = [];
    let professors = [];
    let subjects = {};

    // Initialize
    initializeDefaultDataset();
    updateStats();
    currentFilteredStudents = [...students];
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
        currentFilteredStudents = [...students];
        renderFilteredStudents(students.slice(0, 50));
        filterDept.value = "";
        filterYear.value = "";
        filterDiv.value = "";
        alert('✅ Loaded default dataset (900+ students)');
    });

    // Load Large Dataset
    loadLargeBtn.addEventListener('click', () => {
        initializeLargeDataset();
        updateStats();
        currentFilteredStudents = [...students];
        renderFilteredStudents(students.slice(0, 50));
        filterDept.value = "";
        filterYear.value = "";
        filterDiv.value = "";
        alert('✅ Loaded large dataset (5000+ students)');
    });

    // Apply Filter
    applyFilterBtn.addEventListener('click', () => {
        const dept = filterDept.value;
        const year = filterYear.value;
        const div = filterDiv.value;

        let filtered = [...students];

        if (dept) {
            filtered = filtered.filter(s => s.dept === dept);
        }
        if (year) {
            filtered = filtered.filter(s => s.year === year);
        }
        if (div) {
            filtered = filtered.filter(s => s.division === div);
        }

        currentFilteredStudents = filtered;
        renderFilteredStudents(filtered);
    });

    // Generate Schedule
    generateScheduleBtn.addEventListener('click', () => {
        try {
            const schedule = generateMasterSchedule();
            let html = '<div class="schedule-container">';
            schedule.forEach((subject, i) => {
                html += `
                    <div class="seat-card" style="background: rgba(76, 201, 240, 0.2); border-color: rgba(76, 201, 240, 0.5);">
                        <div>Slot ${i + 1}</div>
                        <div class="roll">${subject}</div>
                    </div>
                `;
            });
            html += '</div>';
            scheduleOutput.innerHTML = html;
        } catch (error) {
            scheduleOutput.innerHTML = `<p style="color: #f87171;">Error: ${error.message}</p>`;
        }
    });

    // Allocate Seats — ✅ Uses ONLY filtered students + Sequential Hall Filling
    allocateSeatsBtn.addEventListener('click', () => {
        if (students.length === 0 || halls.length === 0) {
            seatingOutput.innerHTML = '<p class="placeholder">Please load dataset first.</p>';
            return;
        }

        const studentsToAllocate = currentFilteredStudents.length > 0 ? currentFilteredStudents : students;

        const allocation = allocateSeatsWithConflictAvoidance(studentsToAllocate, halls);
        let html = '';

        for (const [hallName, assignedStudents] of Object.entries(allocation)) {
            html += `<h3 style="color: var(--accent); margin: 25px 0 15px 0;">🏫 ${hallName} (${assignedStudents.length}/${halls.find(h => h.name === hallName)?.capacity || 0})</h3>`;
            if (assignedStudents.length === 0) {
                continue;
            }

            assignedStudents.forEach(student => {
                html += `
                    <div class="seat-card">
                        <div class="roll">${student.roll}</div>
                        <div class="name">${student.name}</div>
                        <div style="font-size: 0.8rem; color: var(--gray);">${student.dept}-${student.year}-${student.division}</div>
                    </div>
                `;
            });

            // Assign invigilator
            const hallIndex = halls.findIndex(h => h.name === hallName);
            if (professors.length > 0) {
                const prof = professors[hallIndex % professors.length];
                html += `<p style="margin-top: 15px; color: var(--success);"><i class="fas fa-chalkboard-teacher"></i> Invigilator: ${prof}</p>`;
            }
        }

        seatingOutput.innerHTML = html || '<p class="placeholder">No seating allocated.</p>';
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
                    <small>ID: ${student.id} | ${student.dept}-${student.year}-${student.division}</small><br>
                    <small>Subjects: ${student.subjects.join(', ')}</small>
                </div>
            `;
        });

        searchResults.innerHTML = html;
    });

    // Analyze Performance
    analyzeBtn.addEventListener('click', () => {
        const metrics = analyzePerformance();
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
                    <p>Students: ${students.length.toLocaleString()}</p>
                    <p>Halls: ${halls.length}</p>
                    <p>Professors: ${professors.length}</p>
                    <p>Subjects: ${metrics.subjectCount}</p>
                </div>
            </div>
            <div style="margin-top: 30px; background: rgba(251, 191, 36, 0.1); padding: 20px; border-radius: 15px; border-left: 4px solid #fbbf24;">
                <h4>🧩 Algorithmic Approach</h4>
                <p><strong>Seating:</strong> Greedy with Conflict Avoidance Heuristic (First-Fit)</p>
                <p><strong>Scheduling:</strong> Topological Sort for Subject Dependencies</p>
                <p><strong>Search:</strong> Linear String Matching</p>
                <p><strong>NP-Completeness:</strong> Perfect solution = Graph Coloring → NP-Complete → Heuristics used</p>
            </div>
        `;
        performanceMetrics.innerHTML = html;
    });

    // Initialize Functions
    function initializeDefaultDataset() {
        const depts = ["CSE", "IT", "Mechanical", "Civil", "Electrical"];
        const yrs = ["FY", "SY", "TY", "LY"];
        const divs = ["A", "B", "C"];

        subjects = {
            // CSE
            "CSE-FY-A": ["Math-I", "Physics", "BEE", "Workshop", "Engg Drawing"],
            "CSE-FY-B": ["Math-I", "Physics", "BEE", "Workshop", "Engg Drawing"],
            "CSE-SY-A": ["DSA", "COA", "Math-II", "Chemistry", "PPS"],
            "CSE-SY-B": ["DSA", "COA", "Math-II", "Chemistry", "PPS"],
            "CSE-TY-A": ["DBMS", "OS", "CN", "TOC", "SE"],
            "CSE-TY-B": ["DBMS", "OS", "CN", "TOC", "SE"],
            "CSE-LY-A": ["AI", "ML", "Blockchain", "Cloud", "Project"],
            "CSE-LY-B": ["AI", "ML", "Blockchain", "Cloud", "Project"],
            "CSE-LY-C": ["AI", "ML", "Blockchain", "Cloud", "Project"],

            // IT
            "IT-FY-A": ["Math-I", "Physics", "BEE", "Workshop", "Engg Drawing"],
            "IT-FY-B": ["Math-I", "Physics", "BEE", "Workshop", "Engg Drawing"],
            "IT-SY-A": ["DSA", "COA", "Math-II", "Chemistry", "PPS"],
            "IT-SY-B": ["DSA", "COA", "Math-II", "Chemistry", "PPS"],
            "IT-TY-A": ["DBMS", "OS", "CN", "Web Tech", "SE"],
            "IT-TY-B": ["DBMS", "OS", "CN", "Web Tech", "SE"],
            "IT-LY-A": ["AI", "ML", "Cybersecurity", "Cloud", "Project"],
            "IT-LY-B": ["AI", "ML", "Cybersecurity", "Cloud", "Project"],
            "IT-LY-C": ["AI", "ML", "Cybersecurity", "Cloud", "Project"],

            // Mechanical
            "Mechanical-FY-A": ["Math-I", "Physics", "BEE", "Workshop", "Engg Drawing"],
            "Mechanical-FY-B": ["Math-I", "Physics", "BEE", "Workshop", "Engg Drawing"],
            "Mechanical-SY-A": ["Thermo", "Mechanics", "Math-II", "Materials", "CAD"],
            "Mechanical-SY-B": ["Thermo", "Mechanics", "Math-II", "Materials", "CAD"],
            "Mechanical-TY-A": ["Fluid Mech", "Heat Transfer", "Dynamics", "Design", "Lab"],
            "Mechanical-TY-B": ["Fluid Mech", "Heat Transfer", "Dynamics", "Design", "Lab"],
            "Mechanical-LY-A": ["Automobile", "Robotics", "Project", "Elective-I", "Elective-II"],
            "Mechanical-LY-B": ["Automobile", "Robotics", "Project", "Elective-I", "Elective-II"],
            "Mechanical-LY-C": ["Automobile", "Robotics", "Project", "Elective-I", "Elective-II"],

            // Civil
            "Civil-FY-A": ["Math-I", "Physics", "BEE", "Workshop", "Engg Drawing"],
            "Civil-FY-B": ["Math-I", "Physics", "BEE", "Workshop", "Engg Drawing"],
            "Civil-SY-A": ["Strength", "FM", "Math-II", "Geology", "CAD"],
            "Civil-SY-B": ["Strength", "FM", "Math-II", "Geology", "CAD"],
            "Civil-TY-A": ["Structures", "Hydraulics", "Transport", "Geotech", "Design"],
            "Civil-TY-B": ["Structures", "Hydraulics", "Transport", "Geotech", "Design"],
            "Civil-LY-A": ["Project", "Earthquake", "Smart Cities", "Management", "Enviro"],
            "Civil-LY-B": ["Project", "Earthquake", "Smart Cities", "Management", "Enviro"],
            "Civil-LY-C": ["Project", "Earthquake", "Smart Cities", "Management", "Enviro"],

            // Electrical
            "Electrical-FY-A": ["Math-I", "Physics", "BEE", "Workshop", "Engg Drawing"],
            "Electrical-FY-B": ["Math-I", "Physics", "BEE", "Workshop", "Engg Drawing"],
            "Electrical-SY-A": ["Circuits", "EMF", "Math-II", "Electronics", "PPS"],
            "Electrical-SY-B": ["Circuits", "EMF", "Math-II", "Electronics", "PPS"],
            "Electrical-TY-A": ["Power Sys", "Machines", "Control", "PSD", "SE"],
            "Electrical-TY-B": ["Power Sys", "Machines", "Control", "PSD", "SE"],
            "Electrical-LY-A": ["Renewables", "Smart Grid", "Project", "Drives", "IoT"],
            "Electrical-LY-B": ["Renewables", "Smart Grid", "Project", "Drives", "IoT"],
            "Electrical-LY-C": ["Renewables", "Smart Grid", "Project", "Drives", "IoT"]
        };

        students = [];
        let studentId = 1;
        for (const dept of depts) {
            for (const year of yrs) {
                for (const div of divs) {
                    const key = `${dept}-${year}-${div}`;
                    if (subjects[key]) {
                        for (let i = 1; i <= 60; i++) {
                            students.push({
                                id: `STU${String(studentId).padStart(5, '0')}`,
                                name: `${getRandomName()} ${getRandomLastName()}`,
                                roll: `${dept}/${year}/${div}/${i}`,
                                dept,
                                year,
                                division: div,
                                subjects: subjects[key]
                            });
                            studentId++;
                        }
                    }
                }
            }
        }

        halls = [];
        for (let i = 1; i <= 50; i++) {
            halls.push({
                name: `Hall_${String(i).padStart(3, '0')}`,
                capacity: Math.floor(Math.random() * 30) + 20
            });
        }

        professors = [];
        const firstNames = ["Dr. Smith", "Prof. Johnson", "Dr. Williams", "Prof. Brown", "Dr. Jones"];
        const lastNames = ["Patel", "Sharma", "Kumar", "Singh", "Gupta"];
        for (let i = 1; i <= 50; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            professors.push(`${firstName} ${lastName}`);
        }
    }

    function initializeLargeDataset() {
        students = [];
        let studentId = 1;
        const depts = ["CSE", "IT", "Mech", "Civil", "Elec", "EXTC", "BioTech"];
        const yrs = ["FY", "SY", "TY", "LY"];
        const divs = ["A", "B", "C", "D"];

        for (let d = 0; d < depts.length; d++) {
            for (let y = 0; y < yrs.length; y++) {
                for (let div = 0; div < divs.length; div++) {
                    for (let i = 1; i <= 30; i++) {
                        students.push({
                            id: `STU${String(studentId).padStart(6, '0')}`,
                            name: `${getRandomName()} ${getRandomLastName()}`,
                            roll: `${depts[d]}/${yrs[y]}/${divs[div]}/${i}`,
                            dept: depts[d],
                            year: yrs[y],
                            division: divs[div],
                            subjects: ["Subject1", "Subject2", "Subject3"]
                        });
                        studentId++;
                    }
                }
            }
        }

        halls = [];
        for (let i = 1; i <= 100; i++) {
            halls.push({
                name: `Hall_${String(i).padStart(3, '0')}`,
                capacity: Math.floor(Math.random() * 50) + 30
            });
        }

        professors = [];
        const firstNames = ["Dr. Smith", "Prof. Johnson", "Dr. Williams", "Prof. Brown", "Dr. Jones", "Dr. Wilson", "Prof. Anderson"];
        const lastNames = ["Patel", "Sharma", "Kumar", "Singh", "Gupta", "Mishra", "Verma"];
        for (let i = 1; i <= 100; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            professors.push(`${firstName} ${lastName}`);
        }
    }

    function updateStats() {
        studentCountEl.textContent = students.length.toLocaleString();
        hallCountEl.textContent = halls.length;
        profCountEl.textContent = professors.length;
        subjectCountEl.textContent = new Set(Object.values(subjects).flat()).size;
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
                    <small>${student.roll} | ${student.dept}-${student.year}-${student.division}</small>
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

    // ✅ FIXED: Sequential Hall Filling + Conflict Avoidance (No overwriting original halls)
    function allocateSeatsWithConflictAvoidance(students, halls) {
        // ✅ Sort halls by name to ensure Hall_001, Hall_002, etc.
        const sortedHalls = [...halls].sort((a, b) => a.name.localeCompare(b.name));

        const allocation = {};
        sortedHalls.forEach(hall => allocation[hall.name] = []);

        // Make a copy of students to avoid modifying original
        let studentsToAllocate = [...students];

        // Process each hall in strict sequential order
        for (const hall of sortedHalls) {
            // Phase 1: Assign students WITHOUT conflicts (ideal case)
            for (let i = 0; i < studentsToAllocate.length && allocation[hall.name].length < hall.capacity; i++) {
                const student = studentsToAllocate[i];
                let hasConflict = false;

                // Check for conflicts with already seated students in this hall
                for (const seatedStudent of allocation[hall.name]) {
                    const commonSubjects = student.subjects.filter(s =>
                        seatedStudent.subjects.includes(s)
                    );
                    if (commonSubjects.length > 0) {
                        hasConflict = true;
                        break;
                    }
                }

                // If no conflict, assign to this hall
                if (!hasConflict) {
                    allocation[hall.name].push(student);
                    studentsToAllocate.splice(i, 1);
                    i--; // Adjust index after removal
                }
            }

            // Phase 2: If hall still has space, fill it with ANY remaining students (ignore conflicts)
            for (let i = 0; i < studentsToAllocate.length && allocation[hall.name].length < hall.capacity; i++) {
                const student = studentsToAllocate[i];
                allocation[hall.name].push(student);
                studentsToAllocate.splice(i, 1);
                i--; // Adjust index after removal
            }

            // Only move to next hall if current hall is FULL or no students left
            if (allocation[hall.name].length < hall.capacity && studentsToAllocate.length > 0) {
                console.warn(`Hall ${hall.name} not fully filled (${allocation[hall.name].length}/${hall.capacity}), but moving to next hall due to no more students.`);
            }
        }

        return allocation;
    }

    // ADA Algorithms
    function generateMasterSchedule() {
        const dependencies = {};
        const allSubjects = new Set();

        Object.values(subjects).forEach(subList => {
            subList.forEach(sub => {
                allSubjects.add(sub);
                if (!dependencies[sub]) dependencies[sub] = [];
            });
        });

        const prereqs = {
            "DSA": ["PPS"],
            "DBMS": ["DSA"],
            "OS": ["COA"],
            "CN": ["COA"],
            "TOC": ["Math-II"],
            "AI": ["DBMS", "Math-II"],
            "ML": ["AI", "Math-II"]
        };

        for (const [course, prereqList] of Object.entries(prereqs)) {
            if (dependencies[course]) {
                dependencies[course].push(...prereqList.filter(p => allSubjects.has(p)));
            }
        }

        return topologicalSort(dependencies);
    }

    function analyzePerformance() {
        const n = students.length;
        const m = halls.length;
        const s = new Set(Object.values(subjects).flat()).size;

        return {
            seatingComplexity: `O(n × m) = O(${n} × ${m}) = O(${(n * m).toLocaleString()})`,
            schedulingComplexity: `O(V + E) ≈ O(${s} + ${Math.floor(s * 0.3)})`,
            searchComplexity: `O(n × len) for string matching`,
            spaceComplexity: `O(n + m + s) for data structures`,
            subjectCount: s
        };
    }

    function topologicalSort(dependencies) {
        const allCourses = new Set([...Object.keys(dependencies), ...Object.values(dependencies).flat()]);
        const reverseGraph = {};
        const inDegree = {};

        allCourses.forEach(course => {
            reverseGraph[course] = [];
            inDegree[course] = 0;
        });

        for (const [course, prereqs] of Object.entries(dependencies)) {
            prereqs.forEach(prereq => {
                reverseGraph[prereq].push(course);
                inDegree[course]++;
            });
        }

        const queue = [...allCourses].filter(course => inDegree[course] === 0);
        const result = [];

        while (queue.length > 0) {
            const current = queue.shift();
            result.push(current);
            reverseGraph[current].forEach(neighbor => {
                inDegree[neighbor]--;
                if (inDegree[neighbor] === 0) queue.push(neighbor);
            });
        }

        if (result.length !== allCourses.size) {
            throw new Error("Cycle detected in prerequisites!");
        }
        return result;
    }

    function getRandomName() {
        const names = ["Aarav", "Vihaan", "Aditya", "Arjun", "Reyansh", "Ananya", "Aadhya", "Diya", "Pari", "Anika"];
        return names[Math.floor(Math.random() * names.length)];
    }

    function getRandomLastName() {
        const names = ["Patel", "Sharma", "Kumar", "Singh", "Gupta", "Mishra", "Verma", "Yadav", "Joshi", "Pandey"];
        return names[Math.floor(Math.random() * names.length)];
    }
});