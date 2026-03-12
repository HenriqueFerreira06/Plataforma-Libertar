// ==========================================
// IMPORTAÇÕES E CONFIGURAÇÕES DE AMBIENTE (FIREBASE)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, getDocs, query, where, addDoc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBlZj_j8WZC4fALp9aPhzNyaXZaqrsoVqs",
    authDomain: "libertarbd.firebaseapp.com",
    projectId: "libertarbd",
    storageBucket: "libertarbd.firebasestorage.app",
    messagingSenderId: "989803267776",
    appId: "1:989803267776:web:4227525600b40d38d70f25"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const appCadastro = initializeApp(firebaseConfig, "AppParaCadastros");
const authCadastro = getAuth(appCadastro);

// ==========================================
// MÓDULO 1: AUTENTICAÇÃO E RECUPERAÇÃO DE CREDENCIAIS
// ==========================================
const formLogin = document.getElementById('form-login');

if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault(); 
        const email = document.getElementById('email-login').value;
        const senha = document.getElementById('senha-login').value;

        signInWithEmailAndPassword(auth, email, senha)
            .then(() => { window.location.href = "dashboard.html"; })
            .catch((error) => {
                if(error.code === 'auth/invalid-credential') alert("Acesso negado: E-mail ou senha incorretos.");
                else alert("Erro de autenticação: " + error.message);
            });
    });

    const btnEnviarRecuperacao = document.getElementById('btn-enviar-recuperacao');
    if (btnEnviarRecuperacao) {
        btnEnviarRecuperacao.addEventListener('click', () => {
            const emailParaReset = document.getElementById('email-recuperacao').value;
            if (!emailParaReset) { alert("Validação: É obrigatório informar um endereço de e-mail."); return; }

            btnEnviarRecuperacao.innerText = "Processando...";
            btnEnviarRecuperacao.disabled = true;

            sendPasswordResetEmail(auth, emailParaReset)
                .then(() => {
                    alert("Instruções de redefinição encaminhadas para o e-mail informado.");
                    const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modalEsqueciSenha'));
                    modalInstance.hide();
                    document.getElementById('email-recuperacao').value = '';
                })
                .catch((error) => {
                    if (error.code === 'auth/invalid-email') alert("Erro: Formato de e-mail inválido.");
                    else if (error.code === 'auth/user-not-found' || error.code === 'auth/missing-email') alert("Erro: O e-mail informado não consta na base de dados.");
                    else alert("Falha no processamento: " + error.message);
                })
                .finally(() => {
                    btnEnviarRecuperacao.innerText = "Enviar Link";
                    btnEnviarRecuperacao.disabled = false;
                });
        });
    }
}

// ==========================================
// MÓDULO 2: CADASTRO DE ALUNOS
// ==========================================
const formNovoAluno = document.getElementById('form-novo-aluno');

if (formNovoAluno) {
    const inputCpfCadastro = document.getElementById('cpf');

    const aplicarMascaraCPF = (event) => {
        let value = event.target.value.replace(/\D/g, ""); 
        if (value.length > 11) value = value.slice(0, 11); 
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        event.target.value = value;
    };

    const validarCPF = (cpf) => {
        cpf = cpf.replace(/\D/g, ''); 
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false; 
        let soma = 0, resto;
        for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i-1, i)) * (11 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(9, 10))) return false;
        soma = 0;
        for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i-1, i)) * (12 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(10, 11))) return false;
        return true;
    };

    if (inputCpfCadastro) {
        inputCpfCadastro.setAttribute('maxlength', '14');
        inputCpfCadastro.addEventListener('input', aplicarMascaraCPF);
    }

    formNovoAluno.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const cpf = document.getElementById('cpf').value;
        const polo = document.getElementById('polo').value;
        const turma = document.getElementById('turma').value;
        
        if (!validarCPF(cpf)) {
            alert("Validação pendente: O CPF informado falhou na verificação algorítmica.");
            document.getElementById('cpf').focus();
            return;
        }

        const senhaInicial = cpf.replace(/\D/g, ""); 

        createUserWithEmailAndPassword(authCadastro, email, senhaInicial)
            .then((userCredential) => {
                const userAluno = userCredential.user;
                return setDoc(doc(db, "alunos", userAluno.uid), {
                    nome_completo: nome,
                    email: email,
                    cpf: cpf,
                    polo: polo,
                    turma: turma,
                    status: "ativo",
                    total_presencas: 0,
                    total_faltas: 0,
                    data_cadastro: new Date()
                });
            })
            .then(() => {
                alert("Cadastro concluído. A senha inicial foi definida como o CPF (somente números).");
                formNovoAluno.reset(); 
            })
            .catch((error) => {
                if(error.code === 'auth/email-already-in-use') alert("Aviso: Há um conflito de unicidade. Este e-mail já está registrado.");
                else alert("Exceção não tratada durante o cadastro: " + error.message);
            });
    });
}

// ==========================================
// MÓDULO 3: LEITURA E FILTRAGEM DE ALUNOS
// ==========================================
const tabelaAlunos = document.getElementById('tabela-alunos');
let listaDeAlunos = []; 

if (tabelaAlunos) {
    const inputBusca = document.getElementById('busca-nome');
    const selectPolo = document.getElementById('filtro-polo');
    const selectTurma = document.getElementById('filtro-turma');
    const selectStatus = document.getElementById('filtro-status'); 

    async function buscarAlunosNoBanco() {
        tabelaAlunos.innerHTML = '<tr><td colspan="6" class="text-center py-4">Sincronizando com o Firestore...</td></tr>';
        try {
            const querySnapshot = await getDocs(collection(db, "alunos"));
            listaDeAlunos = []; 
            querySnapshot.forEach((doc) => {
                const aluno = doc.data();
                aluno.idFirebase = doc.id; 
                listaDeAlunos.push(aluno); 
            });
            desenharTabela(listaDeAlunos);
        } catch (error) {
            console.error("Falha na execução de leitura (GET):", error);
            tabelaAlunos.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Falha de conexão com a infraestrutura de dados.</td></tr>';
        }
    }

    function desenharTabela(alunosParaMostrar) {
        tabelaAlunos.innerHTML = ''; 
        if(alunosParaMostrar.length === 0) {
            tabelaAlunos.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Nenhum documento satisfaz os parâmetros informados.</td></tr>';
            return;
        }

        alunosParaMostrar.forEach((aluno) => {
            const matricula = aluno.idFirebase.substring(0, 5).toUpperCase(); 
            const row = `
                <tr>
                    <td class="fw-bold text-secondary">#${matricula}</td>
                    <td>${aluno.nome_completo}</td>
                    <td>${aluno.polo}</td>
                    <td>${aluno.turma}</td>
                    <td><span class="badge ${aluno.status === 'ativo' ? 'bg-success' : 'bg-danger'}">${aluno.status.toUpperCase()}</span></td>
                    <td class="admin-only">
                        <a href="editarAluno.html?id=${aluno.idFirebase}" class="btn btn-sm btn-outline-secondary" title="Editar Metadados"><i class="bi bi-pencil"></i></a>
                    </td>
                </tr>
            `;
            tabelaAlunos.innerHTML += row;
        });
    }

    function aplicarFiltros() {
        let alunosFiltrados = listaDeAlunos;
        if (inputBusca && inputBusca.value.trim() !== '') {
            const termo = inputBusca.value.toLowerCase();
            alunosFiltrados = alunosFiltrados.filter(aluno => 
                aluno.nome_completo.toLowerCase().includes(termo) || 
                (aluno.cpf && aluno.cpf.includes(termo))
            );
        }
        if (selectPolo && selectPolo.value !== "todos" && selectPolo.value !== "") alunosFiltrados = alunosFiltrados.filter(aluno => aluno.polo === selectPolo.value);
        if (selectTurma && selectTurma.value !== "todos") alunosFiltrados = alunosFiltrados.filter(aluno => aluno.turma === selectTurma.value);
        if (selectStatus && selectStatus.value !== "todos") alunosFiltrados = alunosFiltrados.filter(aluno => aluno.status === selectStatus.value);
        
        desenharTabela(alunosFiltrados);
    }

    if(inputBusca) inputBusca.addEventListener('input', aplicarFiltros);
    if(selectPolo) selectPolo.addEventListener('change', aplicarFiltros);
    if(selectTurma) selectTurma.addEventListener('change', aplicarFiltros);
    if(selectStatus) selectStatus.addEventListener('change', aplicarFiltros);

    buscarAlunosNoBanco();
}

// ==========================================
// MÓDULO 4: REGISTRO DE FREQUÊNCIA (presenca.html)
// ==========================================
const btnCarregarTurma = document.getElementById('btn-carregar-turma');
const tabelaChamada = document.getElementById('tabela-chamada');
const btnAddVisitante = document.getElementById('btn-add-visitante');
const btnSalvarChamada = document.getElementById('btn-salvar-chamada');

if (btnCarregarTurma) {
    let listaChamada = []; 

    btnCarregarTurma.addEventListener('click', async () => {
        const turmaSelecionada = document.getElementById('turma-chamada').value;
        const selectPoloNode = document.getElementById('polo-chamada');
        const poloSelecionado = selectPoloNode ? selectPoloNode.value : null;

        if (!turmaSelecionada || turmaSelecionada === "Selecione..." || !poloSelecionado || poloSelecionado === "") {
            alert("Restrição: É necessário definir os parâmetros de Polo e Turma para a extração da lista.");
            return;
        }

        tabelaChamada.innerHTML = '<tr><td colspan="3" class="text-center py-4">Processando requisição de dados...</td></tr>';

        try {
            const q = query(
                collection(db, "alunos"), 
                where("polo", "==", poloSelecionado),
                where("turma", "==", turmaSelecionada), 
                where("status", "==", "ativo")
            );
            
            const querySnapshot = await getDocs(q);
            listaChamada = [];
            
            if (querySnapshot.empty) {
                tabelaChamada.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-danger">A query não retornou documentos ativos para estes parâmetros.</td></tr>';
                return;
            }

            querySnapshot.forEach((docSnap) => {
                const aluno = docSnap.data();
                listaChamada.push({
                    idFirebase: docSnap.id,
                    nome: aluno.nome_completo,
                    matricula: docSnap.id.substring(0, 5).toUpperCase(),
                    visitante: false
                });
            });

            listaChamada.sort((a, b) => a.nome.localeCompare(b.nome));
            desenharTabelaChamada();

        } catch (error) {
            console.error("Exceção gerada na query da turma:", error);
            if (error.message.includes("index") || error.message.includes("indexes")) {
                alert("Aviso de Infraestrutura: O Firestore requer a construção de um Índice Composto para esta query. Verifique o Console (F12).");
            } else {
                tabelaChamada.innerHTML = '<tr><td colspan="3" class="text-center text-danger py-4">Erro interno de servidor.</td></tr>';
            }
        }
    });

    function desenharTabelaChamada() {
        tabelaChamada.innerHTML = '';
        listaChamada.forEach((aluno, index) => {
            const row = `
                <tr>
                    <td class="fw-bold text-secondary">#${aluno.matricula}</td>
                    <td>${aluno.nome} ${aluno.visitante ? '<span class="badge bg-warning text-dark ms-2">Registro Provisório</span>' : ''}</td>
                    <td class="text-center">
                        <div class="btn-group" role="group">
                            <input type="radio" class="btn-check" name="presenca_${index}" id="presente_${index}" value="presente" checked>
                            <label class="btn btn-outline-success btn-sm px-3" for="presente_${index}">P</label>
                            <input type="radio" class="btn-check" name="presenca_${index}" id="falta_${index}" value="falta">
                            <label class="btn btn-outline-danger btn-sm px-3" for="falta_${index}">F</label>
                        </div>
                    </td>
                </tr>
            `;
            tabelaChamada.innerHTML += row;
        });
    }

    if (btnAddVisitante) {
        btnAddVisitante.addEventListener('click', () => {
            const inputVisitante = document.getElementById('nome-visitante');
            const nome = inputVisitante.value.trim();
            if (nome === '') { alert("Validação: O nome da string de visitante não pode ser vazio."); return; }
            if (listaChamada.length === 0 && !confirm("Override: Submeter entrada em matriz vazia?")) return;

            listaChamada.push({ idFirebase: "temp_" + Date.now(), nome: nome, matricula: "N/A", visitante: true });
            inputVisitante.value = ''; 
            desenharTabelaChamada(); 
        });
    }

    if (btnSalvarChamada) {
        btnSalvarChamada.addEventListener('click', async () => {
            const data = document.getElementById('data-chamada').value;
            const polo = document.getElementById('polo-chamada') ? document.getElementById('polo-chamada').value : "";
            const turma = document.getElementById('turma-chamada').value;
            const prof = document.getElementById('prof-chamada').value.trim();
            const disc = document.getElementById('disc-chamada').value.trim();

            if (!data || turma === "Selecione..." || !polo || polo === "" || !prof || !disc) {
                alert("Restrição de integridade: Preenchimento obrigatório dos campos-chave (Data, Polo, Turma, Docente e Disciplina).");
                return;
            }
            if (listaChamada.length === 0) { alert("Falha lógica: O vetor de presença está vazio."); return; }

            let registrosDePresenca = [];
            listaChamada.forEach((aluno, index) => {
                const radios = document.getElementsByName(`presenca_${index}`);
                let statusFinal = "presente"; 
                for (let radio of radios) if (radio.checked) { statusFinal = radio.value; break; }
                
                registrosDePresenca.push({
                    id_aluno: aluno.idFirebase, nome: aluno.nome, matricula: aluno.matricula, visitante: aluno.visitante, status: statusFinal 
                });
            });

            btnSalvarChamada.innerText = "SUBMETENDO PAYLOAD...";
            btnSalvarChamada.disabled = true;

            try {
                await addDoc(collection(db, "chamadas"), {
                    data: data, polo: polo, turma: turma, professor: prof, disciplina: disc, alunos: registrosDePresenca, data_registro: new Date()
                });

                alert("Transação efetuada: Documento de presença persistido na base de dados.");
                
                document.getElementById('prof-chamada').value = '';
                document.getElementById('disc-chamada').value = '';
                document.getElementById('nome-visitante').value = '';
                listaChamada = [];
                tabelaChamada.innerHTML = '<tr><td colspan="3" class="text-center py-5 text-muted">Aguardando novos parâmetros para consulta.</td></tr>';
            } catch (error) {
                console.error("Falha no commit de transação:", error);
                alert("Erro I/O: " + error.message);
            } finally {
                btnSalvarChamada.innerText = "SALVAR CHAMADA NO BANCO";
                btnSalvarChamada.disabled = false;
            }
        });
    }
}

// ==========================================
// MÓDULO 5: ATUALIZAÇÃO E DELEÇÃO DE ALUNOS (editarAluno.html)
// ==========================================
const formEditarAluno = document.getElementById('form-editar-aluno');

if (formEditarAluno) {
    const urlParams = new URLSearchParams(window.location.search);
    const alunoId = urlParams.get('id');

    const aplicarMascaraCPF = (event) => {
        let value = event.target.value.replace(/\D/g, ""); 
        if (value.length > 11) value = value.slice(0, 11); 
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        event.target.value = value;
    };

    const validarCPF = (cpf) => {
        cpf = cpf.replace(/\D/g, ''); 
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false; 
        let soma = 0, resto;
        for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i-1, i)) * (11 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(9, 10))) return false;
        soma = 0;
        for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i-1, i)) * (12 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(10, 11))) return false;
        return true;
    };

    const inputCpfEdit = document.getElementById('edit-cpf');
    if (inputCpfEdit) {
        inputCpfEdit.setAttribute('maxlength', '14');
        inputCpfEdit.addEventListener('input', aplicarMascaraCPF);
    }

    if (!alunoId) {
        alert("Exceção de Roteamento: Chave primária (ID) não fornecida.");
        window.location.href = "consultaAluno.html"; 
    } else {
        carregarDadosDoAluno(alunoId);
    }

    async function carregarDadosDoAluno(id) {
        try {
            const docRef = doc(db, "alunos", id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const aluno = docSnap.data();
                document.getElementById('edit-id').value = id;
                document.getElementById('edit-nome').value = aluno.nome_completo;
                document.getElementById('edit-email').value = aluno.email;
                document.getElementById('edit-cpf').value = aluno.cpf;
                document.getElementById('edit-polo').value = aluno.polo;
                document.getElementById('edit-turma').value = aluno.turma;
                document.getElementById('edit-status').value = aluno.status;

                calcularFrequenciaDoAluno(id, aluno.turma);
            } else {
                alert("Erro 404: Documento não referenciado no banco.");
                window.location.href = "consultaAluno.html";
            }
        } catch (error) {
            console.error("Exceção na leitura do documento:", error);
            alert("Erro fatal na comunicação remota.");
        }
    }

    async function calcularFrequenciaDoAluno(idAluno, turmaAluno) {
        try {
            const q = query(collection(db, "chamadas"), where("turma", "==", turmaAluno));
            const chamadasSnapshot = await getDocs(q);

            let totalAulas = 0, presencas = 0, faltas = 0;

            chamadasSnapshot.forEach((chamadaDoc) => {
                const chamadaData = chamadaDoc.data();
                totalAulas++; 
                const registroDoAluno = chamadaData.alunos.find(a => a.id_aluno === idAluno);
                if (registroDoAluno) {
                    if (registroDoAluno.status === "presente") presencas++;
                    else if (registroDoAluno.status === "falta") faltas++;
                }
            });

            let porcentagem = 0;
            if (totalAulas > 0) porcentagem = Math.round((presencas / totalAulas) * 100);

            document.getElementById('display-total-aulas').innerText = totalAulas;
            document.getElementById('display-presencas').innerText = presencas;
            document.getElementById('display-faltas').innerText = faltas;
            document.getElementById('display-porcentagem').innerText = `${porcentagem}%`;

            const circle = document.getElementById('display-porcentagem').parentElement;
            if (porcentagem >= 75) circle.style.borderColor = "var(--ativo-bg)"; 
            else if (porcentagem >= 50) circle.style.borderColor = "#f8c300"; 
            else circle.style.borderColor = "var(--inativo-bg)"; 
        } catch (error) {
            console.error("Falha no serviço de análise de frequência:", error);
        }
    }

    formEditarAluno.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cpfDigitado = document.getElementById('edit-cpf').value;

        if (!validarCPF(cpfDigitado)) {
            alert("Falha de Validação: O CPF retornado não atende aos critérios algorítmicos.");
            return;
        }

        const btnSalvar = document.getElementById('btn-salvar-edicao');
        btnSalvar.innerText = "ATUALIZANDO...";
        btnSalvar.disabled = true;

        try {
            await updateDoc(doc(db, "alunos", alunoId), {
                nome_completo: document.getElementById('edit-nome').value,
                email: document.getElementById('edit-email').value,
                cpf: cpfDigitado,
                polo: document.getElementById('edit-polo').value,
                turma: document.getElementById('edit-turma').value,
                status: document.getElementById('edit-status').value
            });
            alert("Transação efetuada: O documento foi modificado com sucesso.");
            window.location.href = "consultaAluno.html"; 
        } catch (error) {
            alert("Erro I/O durante atualização: " + error.message);
        } finally {
            btnSalvar.innerText = "SALVAR ALTERAÇÕES";
            btnSalvar.disabled = false;
        }
    });

    const btnExcluir = document.getElementById('btn-excluir-aluno');
    if (btnExcluir) {
        btnExcluir.addEventListener('click', async () => {
            const confirmacao = confirm("CUIDADO: Confirma a exclusão deste documento? Esta operação do Firestore é irreversível.");
            if (confirmacao) {
                try {
                    await deleteDoc(doc(db, "alunos", alunoId));
                    alert("Documento expurgado com sucesso.");
                    window.location.href = "consultaAluno.html"; 
                } catch (error) {
                    alert("Erro no expurgo do registro: " + error.message);
                }
            }
        });
    }
}

// ==========================================
// MÓDULO 6: ROLE-BASED ACCESS CONTROL (RBAC) E DASHBOARDS
// ==========================================
const greetingDisplay = document.getElementById('user-greeting-display');
const adminDashboardCards = document.getElementById('admin-dashboard-cards');
const displayAtivos = document.getElementById('dash-ativos');
const displayInativos = document.getElementById('dash-inativos');
const displayAulas = document.getElementById('dash-aulas');
const displayTotalAlunos = document.getElementById('dash-total-alunos');
const alunoDashboardCards = document.getElementById('aluno-dashboard-cards');
const profDashboardCards = document.getElementById('prof-dashboard-cards');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            let nomeExibicao = "";
            let cargoUsuario = "Aluno"; 
            let turmaAlunoLogado = ""; 
            let dadosCompletosLogados = null;
            
            const docFuncSnap = await getDoc(doc(db, "funcionarios", user.uid));
            
            if (docFuncSnap.exists()) {
                const dadosFunc = docFuncSnap.data();
                nomeExibicao = dadosFunc.nome_completo;
                cargoUsuario = dadosFunc.nivel_acesso; 
                dadosCompletosLogados = dadosFunc;
            } else {
                const docAlunoSnap = await getDoc(doc(db, "alunos", user.uid));
                if (docAlunoSnap.exists()) {
                    const dadosAluno = docAlunoSnap.data();
                    nomeExibicao = dadosAluno.nome_completo;
                    cargoUsuario = "Aluno"; 
                    turmaAlunoLogado = dadosAluno.turma; 
                    dadosCompletosLogados = dadosAluno;
                }
            }
            
            if (!nomeExibicao) {
                nomeExibicao = user.email.split('@')[0];
                cargoUsuario = "Administrador"; 
            }
            
            const pathAtual = window.location.pathname.toLowerCase();
            const isDashboardPage = pathAtual.includes('dashboard.html') || pathAtual === '/' || pathAtual === '';

            // PERFIL: ALUNO
            if (cargoUsuario === "Aluno") {
                if (pathAtual.includes('administração') || pathAtual.includes('alunos') || pathAtual.includes('presenca.html')) {
                    alert("403 Forbidden: Privilégios insuficientes de visualização.");
                    window.location.href = "/dashboard.html"; 
                }

                if (isDashboardPage) {
                    if (adminDashboardCards) adminDashboardCards.style.display = 'none';
                    if (alunoDashboardCards) alunoDashboardCards.style.display = 'flex';
                    carregarEstatisticasAluno(user.uid, turmaAlunoLogado);
                    preencherDadosAluno(dadosCompletosLogados); 
                }
            } 
            // PERFIL: PROFESSOR (APENAS VISUALIZAÇÃO)
            else if (cargoUsuario === "Professor") {
                document.querySelectorAll('.prof-admin-only').forEach(el => el.style.display = 'block');
                
                const rotasProibidas = [
                    'administração/cadastropolo', 'administração/cadastrousuario', 
                    'administração/consultausuario', 'administração/consultapolo', 
                    'administração/editarchamada', 'administração/editarpolo', 
                    'administração/editarusuario', 'alunos/novoaluno', 
                    'alunos/editaraluno', 'alunos/transferenciaaluno'
                ];
                
                const isProibido = rotasProibidas.some(rota => pathAtual.includes(rota));
                
                if (isProibido) {
                    alert("403 Forbidden: Esta área é restrita para uso da Coordenação/Administração.");
                    window.location.href = "/dashboard.html"; 
                }

                if (isDashboardPage) {
                    if (alunoDashboardCards) alunoDashboardCards.style.display = 'none';
                    if (adminDashboardCards) adminDashboardCards.style.display = 'flex';
                    if (displayAtivos) carregarEstatisticasDashboard();

                    if (profDashboardCards) profDashboardCards.style.display = 'block';
                    preencherDadosProfessor(dadosCompletosLogados);
                }
            }
            // PERFIL: ADMINISTRADOR / COORDENADOR
            else if (cargoUsuario === "Administrador" || cargoUsuario.includes("Coordenador")) {
                document.querySelectorAll('.admin-only, .prof-admin-only').forEach(el => el.style.display = 'block');

                if (isDashboardPage) {
                    if (alunoDashboardCards) alunoDashboardCards.style.display = 'none';
                    if (adminDashboardCards) adminDashboardCards.style.display = 'flex';
                    if (displayAtivos) carregarEstatisticasDashboard();

                    if (profDashboardCards) profDashboardCards.style.display = 'block';
                    preencherDadosProfessor(dadosCompletosLogados);
                }
            }

            if (greetingDisplay) {
                const primeiroNome = nomeExibicao.split(' ')[0];
                greetingDisplay.innerText = `OLÁ, ${primeiroNome.toUpperCase()}!`;
            }
            
        } catch (error) {
            console.error("Falha na resolução do payload de acesso:", error);
        }
    } else {
        if(!window.location.pathname.includes('index.html') && window.location.pathname !== '/' && window.location.pathname !== '') {
            window.location.href = "/index.html"; 
        }
    }
});

function preencherDadosAluno(dados) {
    if(!dados) return;
    const elNome = document.getElementById('aluno-dados-nome');
    const elEmail = document.getElementById('aluno-dados-email');
    const elCpf = document.getElementById('aluno-dados-cpf');
    const elPolo = document.getElementById('aluno-dados-polo');
    const elTurma = document.getElementById('aluno-dados-turma');

    if(elNome) elNome.value = dados.nome_completo || '-';
    if(elEmail) elEmail.value = dados.email || '-';
    if(elCpf) elCpf.value = dados.cpf || '-';
    if(elPolo) elPolo.value = dados.polo || '-';
    if(elTurma) elTurma.value = dados.turma || '-';
}

function preencherDadosProfessor(dados) {
    if(!dados) return;
    const elNome = document.getElementById('prof-dados-nome');
    const elEmail = document.getElementById('prof-dados-email');
    const elCpf = document.getElementById('prof-dados-cpf');
    const elCelular = document.getElementById('prof-dados-celular');
    const elPolo = document.getElementById('prof-dados-polo');
    const elData = document.getElementById('prof-dados-data');

    if(elNome) elNome.value = dados.nome_completo || '';
    if(elEmail) elEmail.value = dados.email || '';
    if(elCpf) elCpf.value = dados.cpf || '';
    if(elCelular) elCelular.value = dados.celular || '';
    if(elPolo) elPolo.value = dados.polo || '';
    if(elData) {
        if (dados.data_cadastro && typeof dados.data_cadastro.toDate === 'function') {
            elData.value = dados.data_cadastro.toDate().toLocaleDateString('pt-BR');
        } else if (typeof dados.data_cadastro === 'string') {
            elData.value = dados.data_cadastro;
        } else {
            elData.value = '-';
        }
    }
}

async function carregarEstatisticasDashboard() {
    try {
        const alunosSnapshot = await getDocs(collection(db, "alunos"));
        let totalAtivos = 0, totalInativos = 0;
        let totalGeral = alunosSnapshot.size;

        alunosSnapshot.forEach((doc) => {
            const aluno = doc.data();
            if (aluno.status === "ativo") totalAtivos++;
            else if (aluno.status === "inativo") totalInativos++;
        });

        const chamadasSnapshot = await getDocs(collection(db, "chamadas"));
        const totalAulas = chamadasSnapshot.size; 

        if(displayAtivos) displayAtivos.innerText = totalAtivos;
        if(displayInativos) displayInativos.innerText = totalInativos;
        if(displayTotalAlunos) displayTotalAlunos.innerText = totalGeral;
        if(displayAulas) displayAulas.innerText = totalAulas;

    } catch (error) {
        console.error("Falha de computação nas métricas globais:", error);
    }
}

async function carregarEstatisticasAluno(idAluno, turmaAluno) {
    try {
        const q = query(collection(db, "chamadas"), where("turma", "==", turmaAluno));
        const chamadasSnapshot = await getDocs(q);

        let totalAulas = 0, presencas = 0, faltas = 0;

        chamadasSnapshot.forEach((chamadaDoc) => {
            const chamadaData = chamadaDoc.data();
            totalAulas++; 
            const registroDoAluno = chamadaData.alunos.find(a => a.id_aluno === idAluno);
            if (registroDoAluno) {
                if (registroDoAluno.status === "presente") presencas++;
                else if (registroDoAluno.status === "falta") faltas++;
            }
        });

        let porcentagem = 0;
        if (totalAulas > 0) porcentagem = Math.round((presencas / totalAulas) * 100);

        document.getElementById('dash-aluno-total-aulas').innerText = totalAulas;
        document.getElementById('dash-aluno-presencas').innerText = presencas;
        document.getElementById('dash-aluno-faltas').innerText = faltas;
        document.getElementById('dash-aluno-porcentagem').innerText = `${porcentagem}%`;

        const circle = document.getElementById('dash-aluno-porcentagem').parentElement;
        if (porcentagem >= 75) circle.style.borderColor = "var(--ativo-bg)"; 
        else if (porcentagem >= 50) circle.style.borderColor = "#f8c300"; 
        else circle.style.borderColor = "var(--inativo-bg)"; 

    } catch (error) {
        console.error("Falha no serviço de análise de frequência pessoal:", error);
    }
}

// ==========================================
// MÓDULO 7: CRIAÇÃO DE FUNCIONÁRIOS/STAFF
// ==========================================
const formNovoUsuario = document.getElementById('form-novo-usuario');

if (formNovoUsuario) {
    const aplicarMascaraCPF = (event) => {
        let value = event.target.value.replace(/\D/g, ""); 
        if (value.length > 11) value = value.slice(0, 11); 
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        event.target.value = value;
    };

    const validarCPF = (cpf) => {
        cpf = cpf.replace(/\D/g, ''); 
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false; 
        let soma = 0, resto;
        for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i-1, i)) * (11 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(9, 10))) return false;
        soma = 0;
        for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i-1, i)) * (12 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(10, 11))) return false;
        return true;
    };

    const inputCpfUsuario = document.getElementById('cpf-usuario');
    if (inputCpfUsuario) {
        inputCpfUsuario.setAttribute('maxlength', '14');
        inputCpfUsuario.addEventListener('input', aplicarMascaraCPF);
    }

    formNovoUsuario.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = document.getElementById('nome-usuario').value;
        const email = document.getElementById('email-usuario').value;
        const cpf = document.getElementById('cpf-usuario').value;
        const cargo = document.getElementById('cargo-usuario').value;
        const celular = document.getElementById('celular-usuario').value;
        const acesso = document.getElementById('acesso-usuario').value;
        const polo = document.getElementById('polo-usuario').value;
        const senha = document.getElementById('senha-usuario').value;

        if (!validarCPF(cpf)) {
            alert("Restrição impeditiva: O CPF inserido está incorreto do ponto de vista algorítmico.");
            return;
        }
        if (acesso === "Selecione a permissão..." || polo === "" || polo === "Selecione o polo...") {
            alert("Erro de sintaxe de dados: É imperativo que Nível de Acesso e Polo sejam selecionados.");
            return;
        }

        const btnSalvar = document.getElementById('btn-salvar-usuario');
        btnSalvar.innerText = "PROCESSANDO...";
        btnSalvar.disabled = true;

        createUserWithEmailAndPassword(authCadastro, email, senha)
            .then((userCredential) => {
                const userFuncionario = userCredential.user;
                return setDoc(doc(db, "funcionarios", userFuncionario.uid), {
                    nome_completo: nome, email: email, cpf: cpf, cargo: cargo, celular: celular, nivel_acesso: acesso, polo: polo, status: "ativo", data_cadastro: new Date()
                });
            })
            .then(() => {
                alert("Funcionário provisionado com sucesso.");
                formNovoUsuario.reset(); 
            })
            .catch((error) => {
                if(error.code === 'auth/email-already-in-use') alert("Constraint Violation: E-mail em uso por outro documento.");
                else alert("Falha sistêmica durante criação: " + error.message);
            })
            .finally(() => {
                btnSalvar.innerText = "Salvar Usuário";
                btnSalvar.disabled = false;
            });
    });
}

// ==========================================
// MÓDULO 8: CONSULTA E GERENCIAMENTO DE STAFF
// ==========================================
const tabelaUsuarios = document.getElementById('tabela-usuarios');

if (tabelaUsuarios) {
    const inputBuscaUsuario = document.getElementById('busca-nome-usuario');
    const selectCargoUsuario = document.getElementById('filtro-cargo-usuario');
    const selectPoloUsuario = document.getElementById('filtro-polo-usuario');
    const selectStatusUsuario = document.getElementById('filtro-status-usuario');
    let listaDeUsuarios = []; 

    async function buscarUsuariosNoBanco() {
        tabelaUsuarios.innerHTML = '<tr><td colspan="6" class="text-center py-4">Estabelecendo túnel de dados...</td></tr>';
        try {
            const querySnapshot = await getDocs(collection(db, "funcionarios"));
            listaDeUsuarios = []; 
            querySnapshot.forEach((doc) => {
                const usuario = doc.data();
                usuario.idFirebase = doc.id; 
                listaDeUsuarios.push(usuario); 
            });
            desenharTabelaUsuarios(listaDeUsuarios);
        } catch (error) {
            console.error("Exceção na carga de usuários:", error);
            tabelaUsuarios.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Time-out / Erro na infra de dados.</td></tr>';
        }
    }

    function desenharTabelaUsuarios(usuariosParaMostrar) {
        tabelaUsuarios.innerHTML = ''; 
        if(usuariosParaMostrar.length === 0) {
            tabelaUsuarios.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">A matriz de resultados está vazia.</td></tr>';
            return;
        }

        usuariosParaMostrar.forEach((usuario) => {
            const row = `
                <tr>
                    <td class="fw-bold text-secondary">${usuario.nome_completo}</td>
                    <td>${usuario.email}</td>
                    <td>${usuario.nivel_acesso}</td>
                    <td>${usuario.polo}</td>
                    <td><span class="badge ${usuario.status === 'ativo' ? 'bg-success' : 'bg-danger'}">${usuario.status ? usuario.status.toUpperCase() : 'ATIVO'}</span></td>
                    <td class="admin-only">
                        <a href="editarUsuario.html?id=${usuario.idFirebase}" class="btn btn-sm btn-outline-secondary" title="Configurar Referência"><i class="bi bi-pencil"></i></a>
                    </td>
                </tr>
            `;
            tabelaUsuarios.innerHTML += row;
        });
    }

    function aplicarFiltrosUsuarios() {
        let filtrados = listaDeUsuarios;
        if (inputBuscaUsuario && inputBuscaUsuario.value.trim() !== '') {
            const termo = inputBuscaUsuario.value.toLowerCase();
            filtrados = filtrados.filter(u => u.nome_completo.toLowerCase().includes(termo) || (u.cpf && u.cpf.includes(termo)));
        }
        if (selectCargoUsuario && selectCargoUsuario.value !== "todos") filtrados = filtrados.filter(u => u.nivel_acesso === selectCargoUsuario.value);
        if (selectPoloUsuario && selectPoloUsuario.value !== "todos" && selectPoloUsuario.value !== "") filtrados = filtrados.filter(u => u.polo === selectPoloUsuario.value);
        if (selectStatusUsuario && selectStatusUsuario.value !== "todos") filtrados = filtrados.filter(u => u.status === selectStatusUsuario.value);
        
        desenharTabelaUsuarios(filtrados);
    }

    if(inputBuscaUsuario) inputBuscaUsuario.addEventListener('input', aplicarFiltrosUsuarios);
    if(selectCargoUsuario) selectCargoUsuario.addEventListener('change', aplicarFiltrosUsuarios);
    if(selectPoloUsuario) selectPoloUsuario.addEventListener('change', aplicarFiltrosUsuarios);
    if(selectStatusUsuario) selectStatusUsuario.addEventListener('change', aplicarFiltrosUsuarios);

    buscarUsuariosNoBanco();
}

// ==========================================
// MÓDULO 9: MANUTENÇÃO CADASTRAL DE STAFF (editarUsuario.html)
// ==========================================
const formEditarUsuario = document.getElementById('form-editar-usuario');

if (formEditarUsuario) {
    const urlParams = new URLSearchParams(window.location.search);
    const usuarioId = urlParams.get('id');

    if (!usuarioId) {
        window.location.href = "consultaUsuario.html"; 
    } else {
        carregarDadosDoUsuario(usuarioId);
    }

    async function carregarDadosDoUsuario(id) {
        try {
            const docSnap = await getDoc(doc(db, "funcionarios", id));
            if (docSnap.exists()) {
                const usuario = docSnap.data();
                document.getElementById('edit-id-usuario').value = id;
                document.getElementById('edit-nome-usuario').value = usuario.nome_completo;
                document.getElementById('edit-email-usuario').value = usuario.email;
                document.getElementById('edit-cpf-usuario').value = usuario.cpf;
                document.getElementById('edit-cargo-usuario').value = usuario.cargo;
                document.getElementById('edit-celular-usuario').value = usuario.celular || "";
                document.getElementById('edit-acesso-usuario').value = usuario.nivel_acesso;
                document.getElementById('edit-polo-usuario').value = usuario.polo;
                document.getElementById('edit-status-usuario').value = usuario.status || "ativo";
            } else {
                window.location.href = "consultaUsuario.html";
            }
        } catch (error) {
            console.error("Erro no processamento do fetch GET:", error);
        }
    }

    formEditarUsuario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSalvar = document.getElementById('btn-salvar-edicao-usuario');
        btnSalvar.innerText = "ATUALIZANDO...";
        btnSalvar.disabled = true;

        try {
            await updateDoc(doc(db, "funcionarios", usuarioId), {
                nome_completo: document.getElementById('edit-nome-usuario').value,
                email: document.getElementById('edit-email-usuario').value,
                cpf: document.getElementById('edit-cpf-usuario').value,
                cargo: document.getElementById('edit-cargo-usuario').value,
                celular: document.getElementById('edit-celular-usuario').value,
                nivel_acesso: document.getElementById('edit-acesso-usuario').value,
                polo: document.getElementById('edit-polo-usuario').value,
                status: document.getElementById('edit-status-usuario').value
            });
            alert("Operação HTTP OK: Metadados modificados no banco.");
            window.location.href = "consultaUsuario.html"; 
        } catch (error) {
            console.error("Falha no commit da modificação:", error);
            alert("A atualização falhou: " + error.message);
        } finally {
            btnSalvar.innerText = "SALVAR ALTERAÇÕES";
            btnSalvar.disabled = false;
        }
    });

    const btnExcluir = document.getElementById('btn-excluir-usuario');
    if (btnExcluir) {
        btnExcluir.addEventListener('click', async () => {
            if (confirm("OPERAÇÃO DE RISCO: A deleção deste nó é irreversível. Prosseguir?")) {
                try {
                    await deleteDoc(doc(db, "funcionarios", usuarioId));
                    alert("Aviso do Servidor: Deleção efetuada (200 OK).");
                    window.location.href = "consultaUsuario.html"; 
                } catch (error) {
                    console.error("Exceção não tratada na deleção:", error);
                }
            }
        });
    }
}

// ==========================================
// MÓDULO 10: INICIALIZAÇÃO E CRIAÇÃO DE POLOS (cadastroPolo.html)
// ==========================================
const formNovoPolo = document.getElementById('form-novo-polo');

if (formNovoPolo) {
    formNovoPolo.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        const btnSalvar = document.getElementById('btn-salvar-polo');
        btnSalvar.innerText = "PROCESSANDO PAYLOAD...";
        btnSalvar.disabled = true;

        try {
            await addDoc(collection(db, "polos"), {
                nome: document.getElementById('nome-polo').value,
                cep: document.getElementById('cep-polo').value,
                endereco: document.getElementById('endereco-polo').value,
                numero: document.getElementById('numero-polo').value,
                bairro: document.getElementById('bairro-polo').value,
                cidade: document.getElementById('cidade-polo').value,
                responsavel: document.getElementById('responsavel-polo').value,
                status: "ativo", 
                data_cadastro: new Date()
            });

            alert("Registro gerado. Nova unidade indexada na rede.");
            formNovoPolo.reset(); 
        } catch (error) {
            console.error("Falha no método POST na coleção Polos:", error);
        } finally {
            btnSalvar.innerText = "Salvar Polo";
            btnSalvar.disabled = false;
        }
    });
}

// ==========================================
// MÓDULO 11: GERENCIAMENTO DE TABELA DE UNIDADES (consultaPolo.html)
// ==========================================
const tabelaPolos = document.getElementById('tabela-polos');

if (tabelaPolos) {
    let listaPolos = [];

    async function carregarPolos() {
        try {
            const querySnapshot = await getDocs(collection(db, "polos"));
            listaPolos = [];
            querySnapshot.forEach((doc) => { listaPolos.push({ idFirebase: doc.id, ...doc.data() }); });
            desenharTabelaPolos();
        } catch (error) {
            console.error("Falha na captura do pool de polos:", error);
        }
    }

    function desenharTabelaPolos() {
        const termoBusca = document.getElementById('busca-nome-polo').value.toLowerCase();
        const filtroStatus = document.getElementById('filtro-status-polo').value;
        tabelaPolos.innerHTML = '';

        const polosFiltrados = listaPolos.filter(polo => {
            const matchNomeOuCidade = (polo.nome && polo.nome.toLowerCase().includes(termoBusca)) || (polo.cidade && polo.cidade.toLowerCase().includes(termoBusca));
            const matchStatus = filtroStatus === 'todos' || polo.status === filtroStatus;
            return matchNomeOuCidade && matchStatus;
        });

        if (polosFiltrados.length === 0) {
            tabelaPolos.innerHTML = `<tr><td colspan="5" class="text-center py-4" style="color: var(--text-light);">Array vazio após aplicação dos filtros.</td></tr>`;
            return;
        }

        polosFiltrados.forEach(polo => {
            const tr = document.createElement('tr');
            let badgeStatus = polo.status === 'ativo' ? '<span class="badge bg-success">ATIVO</span>' : '<span class="badge bg-danger">INATIVO</span>';
            tr.innerHTML = `
                <td class="fw-bold" style="color: var(--side-logo-bg);">${polo.nome.toUpperCase()}</td>
                <td>${polo.cidade || '-'}</td>
                <td>${polo.responsavel || 'Não referenciado'}</td>
                <td>${badgeStatus}</td>
                <td class="admin-only">
                    <a href="editarPolo.html?id=${polo.idFirebase}" class="btn btn-sm btn-outline-secondary" title="Gerenciar Unidade"><i class="bi bi-pencil"></i></a>
                </td>
            `;
            tabelaPolos.appendChild(tr);
        });
    }

    document.getElementById('busca-nome-polo').addEventListener('input', desenharTabelaPolos);
    document.getElementById('filtro-status-polo').addEventListener('change', desenharTabelaPolos);

    carregarPolos();
}

// ==========================================
// MÓDULO 12: MIDDLEWARE DE POPULAÇÃO DINÂMICA
// ==========================================
async function preencherPolosDinamicos() {
    const selectsPolos = document.querySelectorAll('.dynamic-polo-select, #filtro-polo, #filtro-polo-usuario');
    if (selectsPolos.length === 0) return;

    try {
        const querySnapshot = await getDocs(collection(db, "polos"));
        let polosAtivos = [];
        querySnapshot.forEach((doc) => {
            const polo = doc.data();
            if (polo.status === 'ativo') polosAtivos.push(polo.nome);
        });

        polosAtivos.sort();

        selectsPolos.forEach(select => {
            const valorSalvo = select.value;
            select.innerHTML = ''; 

            if (select.id.includes('filtro')) {
                select.innerHTML = '<option value="todos">Mostrar Todos os Polos</option>';
                if (select.id === 'filtro-polo-usuario') select.innerHTML += '<option value="Global"> Apenas Funcionários Globais</option>';
            } else {
                select.innerHTML = '<option value="" disabled>Selecione a alocação...</option>';
                if (select.id === 'edit-polo-usuario' || select.id === 'polo-usuario') select.innerHTML += '<option value="Global"> Atuação Global (Rede Completa)</option>';
            }

            polosAtivos.forEach(nomePolo => { select.innerHTML += `<option value="${nomePolo}">${nomePolo}</option>`; });

            if (valorSalvo && !valorSalvo.includes('Carregando') && valorSalvo !== '') {
                if (valorSalvo === "Todos os Polos (Global)") select.value = "Global";
                else select.value = valorSalvo;
            }
        });
    } catch (error) {
        console.error("Falha do parser dinâmico na requisição da lista de polos:", error);
    }
}

preencherPolosDinamicos();

// ==========================================
// MÓDULO 13: ATUALIZAÇÃO E EXCLUSÃO DE POLOS (editarPolo.html)
// ==========================================
const formEditarPolo = document.getElementById('form-editar-polo');

if (formEditarPolo) {
    const urlParams = new URLSearchParams(window.location.search);
    const poloId = urlParams.get('id');

    if (!poloId) window.location.href = "consultaPolo.html";
    else carregarDadosDoPolo(poloId);

    async function carregarDadosDoPolo(id) {
        try {
            const docSnap = await getDoc(doc(db, "polos", id));
            if (docSnap.exists()) {
                const polo = docSnap.data();
                document.getElementById('edit-id-polo').value = id;
                document.getElementById('edit-nome-polo').value = polo.nome;
                document.getElementById('edit-cep-polo').value = polo.cep;
                document.getElementById('edit-endereco-polo').value = polo.endereco;
                document.getElementById('edit-numero-polo').value = polo.numero;
                document.getElementById('edit-bairro-polo').value = polo.bairro;
                document.getElementById('edit-cidade-polo').value = polo.cidade;
                document.getElementById('edit-responsavel-polo').value = polo.responsavel || "";
                document.getElementById('edit-status-polo').value = polo.status || "ativo";
            } else {
                window.location.href = "consultaPolo.html";
            }
        } catch (error) {
            console.error("Falha na leitura do Polo (GET):", error);
        }
    }

    formEditarPolo.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSalvar = document.getElementById('btn-salvar-edicao-polo');
        btnSalvar.innerText = "ATUALIZANDO PAYLOAD...";
        btnSalvar.disabled = true;

        try {
            await updateDoc(doc(db, "polos", poloId), {
                nome: document.getElementById('edit-nome-polo').value,
                cep: document.getElementById('edit-cep-polo').value,
                endereco: document.getElementById('edit-endereco-polo').value,
                numero: document.getElementById('edit-numero-polo').value,
                bairro: document.getElementById('edit-bairro-polo').value,
                cidade: document.getElementById('edit-cidade-polo').value,
                responsavel: document.getElementById('edit-responsavel-polo').value,
                status: document.getElementById('edit-status-polo').value
            });
            alert("Transação efetuada: Dados da unidade sincronizados com sucesso.");
            window.location.href = "consultaPolo.html";
        } catch (error) {
            console.error("Erro na atualização do Polo (PATCH):", error);
        } finally {
            btnSalvar.innerText = "Salvar Alterações";
            btnSalvar.disabled = false;
        }
    });

    const btnExcluirPolo = document.getElementById('btn-excluir-polo');
    if (btnExcluirPolo) {
        btnExcluirPolo.addEventListener('click', async () => {
            if (confirm("ATENÇÃO MÁXIMA: Confirma a exclusão deste polo?")) {
                try {
                    await deleteDoc(doc(db, "polos", poloId));
                    window.location.href = "consultaPolo.html";
                } catch (error) {
                    console.error("Exceção ao deletar polo:", error);
                }
            }
        });
    }
}

// ==========================================
// MÓDULO 14: HISTÓRICO DE CHAMADAS E GERAÇÃO DE PDF (historicoChamadas.html)
// ==========================================
const tabelaHistorico = document.getElementById('tabela-historico');

if (tabelaHistorico) {
    let listaHistorico = []; 

    async function carregarHistoricoNoBanco() {
        tabelaHistorico.innerHTML = '<tr><td colspan="6" class="text-center py-4">Sincronizando registros com o banco de dados...</td></tr>';
        
        try {
            const querySnapshot = await getDocs(collection(db, "chamadas"));
            listaHistorico = [];
            
            querySnapshot.forEach((doc) => {
                listaHistorico.push({ idFirebase: doc.id, ...doc.data() });
            });

            listaHistorico.sort((a, b) => new Date(b.data) - new Date(a.data));
            aplicarFiltrosHistorico(); 
        } catch (error) {
            console.error("Falha na extração do histórico de chamadas:", error);
            tabelaHistorico.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Erro de comunicação com o servidor Firestore.</td></tr>';
        }
    }

    function aplicarFiltrosHistorico() {
        const dataInicio = document.getElementById('busca-data-inicio').value;
        const dataFim = document.getElementById('busca-data-fim').value;
        const filtroPolo = document.getElementById('filtro-polo').value;
        const filtroTurma = document.getElementById('filtro-turma').value;

        let filtrados = listaHistorico;

        if (dataInicio) filtrados = filtrados.filter(chamada => chamada.data >= dataInicio);
        if (dataFim) filtrados = filtrados.filter(chamada => chamada.data <= dataFim);
        if (filtroPolo && filtroPolo !== "todos" && filtroPolo !== "") filtrados = filtrados.filter(chamada => chamada.polo === filtroPolo);
        if (filtroTurma && filtroTurma !== "todos") filtrados = filtrados.filter(chamada => chamada.turma === filtroTurma);

        desenharTabelaHistorico(filtrados);
    }

    function desenharTabelaHistorico(dadosParaMostrar) {
        tabelaHistorico.innerHTML = '';

        if (dadosParaMostrar.length === 0) {
            tabelaHistorico.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Nenhum registro atende aos critérios do filtro.</td></tr>';
            return;
        }

        dadosParaMostrar.forEach(chamada => {
            const dataFormatada = chamada.data.split('-').reverse().join('/');
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold" style="color: var(--side-logo-bg);">${dataFormatada}</td>
                <td>${chamada.polo || 'Global/Não Definido'}</td>
                <td>${chamada.turma}</td>
                <td>${chamada.professor}</td>
                <td>${chamada.disciplina}</td>
                <td>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-secondary px-3" onclick="abrirRelatorio('${chamada.idFirebase}')" title="Gerar Relatório / Imprimir">
                            <i class="bi bi-printer"></i>
                        </button>
                        <a href="editarChamada.html?id=${chamada.idFirebase}" class="btn btn-sm btn-outline-secondary px-3 admin-only" title="Editar Registro / Excluir">
                            <i class="bi bi-pencil"></i>
                        </a>
                    </div>
                </td>
            `;
            tabelaHistorico.appendChild(tr);
        });
    }

    window.abrirRelatorio = function(idFirebase) {
        const chamada = listaHistorico.find(c => c.idFirebase === idFirebase);
        
        if (!chamada) return;

        document.getElementById('rel-data').innerText = chamada.data.split('-').reverse().join('/');
        document.getElementById('rel-polo').innerText = chamada.polo || 'Não Identificado';
        document.getElementById('rel-turma').innerText = chamada.turma;
        document.getElementById('rel-prof').innerText = chamada.professor;
        document.getElementById('rel-disc').innerText = chamada.disciplina;

        const dataHoraAtual = new Date();
        document.getElementById('rel-gerado-em').innerText = dataHoraAtual.toLocaleString('pt-BR');

        const relTabelaAlunos = document.getElementById('rel-tabela-alunos');
        relTabelaAlunos.innerHTML = '';

        const alunosOrdenados = chamada.alunos.sort((a, b) => a.nome.localeCompare(b.nome));

        alunosOrdenados.forEach(aluno => {
            let badgePresenca = aluno.status === 'presente' 
                ? '<span class="badge bg-success w-100" style="letter-spacing: 1px;">PRESENTE</span>' 
                : '<span class="badge bg-danger w-100" style="letter-spacing: 1px;">FALTOU</span>';

            let visitanteTag = aluno.visitante 
                ? ' <span style="font-size: 0.7rem; color: #d97706; font-weight: bold;">(Visitante)</span>' 
                : '';

            relTabelaAlunos.innerHTML += `
                <tr>
                    <td class="fw-bold text-secondary">#${aluno.matricula}</td>
                    <td>${aluno.nome.toUpperCase()} ${visitanteTag}</td>
                    <td class="text-center">${badgePresenca}</td>
                </tr>
            `;
        });

        const modalElement = document.getElementById('modalRelatorio');
        const modalInstance = new bootstrap.Modal(modalElement);
        modalInstance.show();
    };

    document.getElementById('btn-filtrar-historico').addEventListener('click', aplicarFiltrosHistorico);
    carregarHistoricoNoBanco();
}

// ==========================================
// MÓDULO 15: EDIÇÃO E EXCLUSÃO DE CHAMADAS (editarChamada.html)
// ==========================================
const formEditarChamada = document.getElementById('form-editar-chamada');

if (formEditarChamada) {
    const urlParams = new URLSearchParams(window.location.search);
    const chamadaId = urlParams.get('id');
    let dadosAlunosEdicao = []; 

    if (!chamadaId) {
        window.location.href = "historicoChamadas.html";
    } else {
        carregarDadosDaChamada(chamadaId);
    }

    async function carregarDadosDaChamada(id) {
        try {
            const docSnap = await getDoc(doc(db, "chamadas", id));
            if (docSnap.exists()) {
                const chamada = docSnap.data();
                document.getElementById('edit-id-chamada').value = id;
                document.getElementById('edit-data-chamada').value = chamada.data;
                document.getElementById('edit-polo-chamada').value = chamada.polo || "Não definido";
                document.getElementById('edit-turma-chamada').value = chamada.turma;
                document.getElementById('edit-prof-chamada').value = chamada.professor;
                document.getElementById('edit-disc-chamada').value = chamada.disciplina;
                
                dadosAlunosEdicao = chamada.alunos;
                renderizarListaAlunosEdicao();
            }
        } catch (error) {
            console.error("Erro ao carregar chamada:", error);
        }
    }

    function renderizarListaAlunosEdicao() {
        const tabela = document.getElementById('tabela-edicao-chamada');
        tabela.innerHTML = '';

        dadosAlunosEdicao.forEach((aluno, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold">#${aluno.matricula}</td>
                <td>${aluno.nome.toUpperCase()} ${aluno.visitante ? '<small class="text-warning">(Visitante)</small>' : ''}</td>
                <td class="text-center">
                    <div class="btn-group" role="group">
                        <input type="radio" class="btn-check" name="status_${index}" id="p_${index}" value="presente" ${aluno.status === 'presente' ? 'checked' : ''}>
                        <label class="btn btn-outline-success btn-sm px-3" for="p_${index}">P</label>

                        <input type="radio" class="btn-check" name="status_${index}" id="f_${index}" value="falta" ${aluno.status === 'falta' ? 'checked' : ''}>
                        <label class="btn btn-outline-danger btn-sm px-3" for="f_${index}">F</label>
                    </div>
                </td>
            `;
            tabela.appendChild(tr);
        });
    }

    formEditarChamada.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.innerText = "SALVANDO...";
        btn.disabled = true;

        const novosRegistros = dadosAlunosEdicao.map((aluno, index) => {
            const statusMarcado = document.querySelector(`input[name="status_${index}"]:checked`).value;
            return { ...aluno, status: statusMarcado };
        });

        try {
            await updateDoc(doc(db, "chamadas", chamadaId), {
                data: document.getElementById('edit-data-chamada').value,
                professor: document.getElementById('edit-prof-chamada').value,
                disciplina: document.getElementById('edit-disc-chamada').value,
                alunos: novosRegistros
            });
            alert("Chamada atualizada com sucesso!");
            window.location.href = "historicoChamadas.html";
        } catch (error) {
            alert("Erro ao salvar: " + error.message);
        } finally {
            btn.innerText = "SALVAR ALTERAÇÕES";
            btn.disabled = false;
        }
    });

    document.getElementById('btn-excluir-chamada').addEventListener('click', async () => {
        if (confirm("ATENÇÃO: Deseja excluir permanentemente este registro de chamada?")) {
            try {
                await deleteDoc(doc(db, "chamadas", chamadaId));
                alert("Registro excluído!");
                window.location.href = "historicoChamadas.html";
            } catch (error) {
                alert("Erro ao excluir: " + error.message);
            }
        }
    });
}

// ==========================================
// MÓDULO 16: CONSULTA DE TURMAS (consultaTurma.html)
// ==========================================
const tabelaTurma = document.getElementById('tabela-turma');

if (tabelaTurma) {
    const selectPoloTurma = document.getElementById('filtro-polo-turma');
    const selectTurmaLista = document.getElementById('filtro-turma-lista');
    const btnBuscarTurma = document.getElementById('btn-buscar-turma');

    btnBuscarTurma.addEventListener('click', async () => {
        const polo = selectPoloTurma.value;
        const turma = selectTurmaLista.value;

        if (!polo || polo === "todos" || polo === "Selecione a alocação..." || !turma || turma === "todas") {
            alert("Restrição: Selecione um Polo e uma Turma específicos.");
            return;
        }

        tabelaTurma.innerHTML = '<tr><td colspan="4" class="text-center py-4">Sincronizando dados da turma...</td></tr>';

        try {
            const q = query(
                collection(db, "alunos"), 
                where("polo", "==", polo),
                where("turma", "==", turma),
                where("status", "==", "ativo")
            );
            
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                tabelaTurma.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">Nenhum aluno ativo encontrado nesta turma.</td></tr>';
                return;
            }

            let alunosTurma = [];
            querySnapshot.forEach(doc => {
                alunosTurma.push({ idFirebase: doc.id, ...doc.data() });
            });

            alunosTurma.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));

            tabelaTurma.innerHTML = '';
            alunosTurma.forEach(aluno => {
                const matricula = aluno.idFirebase.substring(0, 5).toUpperCase();
                
                const row = `
                    <tr>
                        <td class="fw-bold text-secondary">#${matricula}</td>
                        <td>${aluno.nome_completo}</td>
                        <td>${aluno.email || '-'}</td>
                        <td><span class="badge bg-success">ATIVO</span></td>
                    </tr>
                `;
                tabelaTurma.innerHTML += row;
            });
        } catch (error) {
            console.error("Erro ao buscar turma:", error);
            if (error.message.includes("index")) {
                alert("Aviso: O Firestore requer um Índice Composto para esta query.");
            } else {
                tabelaTurma.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-danger">Erro ao carregar a lista.</td></tr>';
            }
        }
    });
}

// ==========================================
// MÓDULO 17: EDIÇÃO DE DADOS PRÓPRIOS (PERFIL)
// ==========================================
const btnAbrirEdicao = document.getElementById('btn-edit-meus-dados');
const containerBotoes = document.getElementById('container-btn-salvar-meus-dados');
const formMeusDados = document.getElementById('form-meus-dados');

if (btnAbrirEdicao) {
    btnAbrirEdicao.addEventListener('click', () => {
        document.getElementById('prof-dados-nome').disabled = false;
        document.getElementById('prof-dados-email').disabled = false;
        document.getElementById('prof-dados-cpf').disabled = false;
        document.getElementById('prof-dados-celular').disabled = false;
        
        containerBotoes.style.display = 'block';
        btnAbrirEdicao.style.display = 'none';
    });
}

const btnCancelarEdicao = document.getElementById('btn-cancelar-meus-dados');
if (btnCancelarEdicao) {
    btnCancelarEdicao.addEventListener('click', () => {
        window.location.reload(); 
    });
}

if (formMeusDados) {
    formMeusDados.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        const btnSalvar = document.getElementById('btn-salvar-meus-dados');
        btnSalvar.innerText = "SALVANDO...";
        btnSalvar.disabled = true;

        const novosDados = {
            nome_completo: document.getElementById('prof-dados-nome').value,
            email: document.getElementById('prof-dados-email').value,
            cpf: document.getElementById('prof-dados-cpf').value,
            celular: document.getElementById('prof-dados-celular').value
        };

        try {
            await updateDoc(doc(db, "funcionarios", user.uid), novosDados);
            alert("Seus dados foram atualizados com sucesso!");
            window.location.reload();
        } catch (error) {
            console.error("Erro ao atualizar perfil:", error);
            alert("Erro ao salvar alterações: " + error.message);
            btnSalvar.innerText = "Salvar Alterações";
            btnSalvar.disabled = false;
        }
    });
}