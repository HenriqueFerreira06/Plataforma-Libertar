// ==========================================
// IMPORTAÇÕES E CONFIGURAÇÕES DE AMBIENTE (FIREBASE)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, getDocs, query, where, addDoc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Parâmetros de inicialização do projeto Libertar
const firebaseConfig = {
    apiKey: "AIzaSyBlZj_j8WZC4fALp9aPhzNyaXZaqrsoVqs",
    authDomain: "libertarbd.firebaseapp.com",
    projectId: "libertarbd",
    storageBucket: "libertarbd.firebasestorage.app",
    messagingSenderId: "989803267776",
    appId: "1:989803267776:web:4227525600b40d38d70f25"
};

// Inicialização da instância principal (Autenticação de Sessão e Firestore)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Inicialização de instância secundária para rotinas administrativas
// Evita a sobrescrita do token de sessão atual ao criar novos usuários
const appCadastro = initializeApp(firebaseConfig, "AppParaCadastros");
const authCadastro = getAuth(appCadastro);

// ==========================================
// MÓDULO 1: AUTENTICAÇÃO E RECUPERAÇÃO DE CREDENCIAIS (index.html)
// ==========================================
const formLogin = document.getElementById('form-login');

if (formLogin) {
    // Processamento do formulário de Login
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault(); 

        const email = document.getElementById('email-login').value;
        const senha = document.getElementById('senha-login').value;

        // Validação de credenciais via Firebase Auth
        signInWithEmailAndPassword(auth, email, senha)
            .then((userCredential) => {
                window.location.href = "dashboard.html"; // Redirecionamento em caso de sucesso
            })
            .catch((error) => {
                if(error.code === 'auth/invalid-credential') {
                    alert("Acesso negado: E-mail ou senha incorretos.");
                } else {
                    alert("Erro de autenticação: " + error.message);
                }
            });
    });

    // Tratamento de requisição para redefinição de senha
    const btnEnviarRecuperacao = document.getElementById('btn-enviar-recuperacao');

    if (btnEnviarRecuperacao) {
        btnEnviarRecuperacao.addEventListener('click', () => {
            const emailParaReset = document.getElementById('email-recuperacao').value;

            if (!emailParaReset) {
                alert("Validação: É obrigatório informar um endereço de e-mail.");
                return;
            }

            // Bloqueio de UI durante transação de rede
            btnEnviarRecuperacao.innerText = "Processando...";
            btnEnviarRecuperacao.disabled = true;

            sendPasswordResetEmail(auth, emailParaReset)
                .then(() => {
                    alert("Instruções de redefinição encaminhadas para o e-mail informado.");
                    
                    // Encerramento do componente Modal (Bootstrap)
                    const modalElement = document.getElementById('modalEsqueciSenha');
                    const modalInstance = bootstrap.Modal.getInstance(modalElement);
                    modalInstance.hide();
                    
                    document.getElementById('email-recuperacao').value = '';
                })
                .catch((error) => {
                    if (error.code === 'auth/invalid-email') {
                        alert("Erro: Formato de e-mail inválido.");
                    } else if (error.code === 'auth/user-not-found' || error.code === 'auth/missing-email') {
                        alert("Erro: O e-mail informado não consta na base de dados.");
                    } else {
                        alert("Falha no processamento: " + error.message);
                    }
                })
                .finally(() => {
                    // Liberação de UI pós-transação
                    btnEnviarRecuperacao.innerText = "Enviar Link";
                    btnEnviarRecuperacao.disabled = false;
                });
        });
    }
}

// ==========================================
// MÓDULO 2: CADASTRO DE ALUNOS E CRIAÇÃO DE IDENTIDADE (novoAluno.html)
// ==========================================
const formNovoAluno = document.getElementById('form-novo-aluno');

if (formNovoAluno) {
    const inputCpfCadastro = document.getElementById('cpf');

    // Utilitários de manipulação de string para CPF
    const aplicarMascaraCPF = (event) => {
        let value = event.target.value.replace(/\D/g, ""); 
        if (value.length > 11) value = value.slice(0, 11); 
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        event.target.value = value;
    };

    // Algoritmo padrão de validação de CPF (Módulo 11)
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

    // Binding de eventos para máscara em tempo real
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
        
        // Bloqueio de submissão em caso de inconsistência de dados
        if (!validarCPF(cpf)) {
            alert("Validação pendente: O CPF informado falhou na verificação algorítmica.");
            document.getElementById('cpf').focus();
            return;
        }

        // Geração de senha padrão inicial (Apenas numerais do CPF)
        const senhaInicial = cpf.replace(/\D/g, ""); 

        // Criação de perfil de autenticação na instância isolada
        createUserWithEmailAndPassword(authCadastro, email, senhaInicial)
            .then((userCredential) => {
                const userAluno = userCredential.user;
                
                // Persistência de metadados na coleção do Firestore
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
                if(error.code === 'auth/email-already-in-use') {
                    alert("Aviso: Há um conflito de unicidade. Este e-mail já está registrado.");
                } else {
                    alert("Exceção não tratada durante o cadastro: " + error.message);
                }
            });
    });
}

// ==========================================
// MÓDULO 3: LEITURA E FILTRAGEM DE ALUNOS (consultaAluno.html)
// ==========================================
const tabelaAlunos = document.getElementById('tabela-alunos');

// Mapeamento de DOM Elements para a rotina de busca
const inputBusca = document.getElementById('busca-nome');
const selectPolo = document.getElementById('filtro-polo');
const selectTurma = document.getElementById('filtro-turma');
const selectStatus = document.getElementById('filtro-status'); 

// Cache local de documentos para mitigar chamadas redundantes à API
let listaDeAlunos = []; 

if (tabelaAlunos) {
    // Busca primária e montagem do cache de leitura
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

    // Engine de renderização de componentes de tabela
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
                    <td>
                        <span class="badge ${aluno.status === 'ativo' ? 'bg-success' : 'bg-danger'}">
                            ${aluno.status.toUpperCase()}
                        </span>
                    </td>
                    <td class="admin-only">
                        <a href="editarAluno.html?id=${aluno.idFirebase}" class="btn btn-sm btn-outline-secondary" title="Editar Metadados"><i class="bi bi-pencil"></i></a>
                    </td>
                </tr>
            `;
            tabelaAlunos.innerHTML += row;
        });
    }

    // Engine de filtragem multicritério baseada no array em memória
    function aplicarFiltros() {
        let alunosFiltrados = listaDeAlunos;

        if (inputBusca && inputBusca.value.trim() !== '') {
            const termo = inputBusca.value.toLowerCase();
            alunosFiltrados = alunosFiltrados.filter(aluno => 
                aluno.nome_completo.toLowerCase().includes(termo) || 
                (aluno.cpf && aluno.cpf.includes(termo))
            );
        }

        if (selectPolo && selectPolo.value !== "todos" && selectPolo.value !== "") {
            alunosFiltrados = alunosFiltrados.filter(aluno => aluno.polo === selectPolo.value);
        }

        if (selectTurma && selectTurma.value !== "todos") {
            alunosFiltrados = alunosFiltrados.filter(aluno => aluno.turma === selectTurma.value);
        }

        if (selectStatus && selectStatus.value !== "todos") {
            alunosFiltrados = alunosFiltrados.filter(aluno => aluno.status === selectStatus.value);
        }

        desenharTabela(alunosFiltrados);
    }

    // Vinculação de handlers aos eventos de interface
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
    let listaChamada = []; // Buffer de memória para payload de submissão

    // Consulta complexa ao Firestore para geração de lista de chamada
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
            // Executa consulta indexada no banco filtrando por propriedades estritas
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

            // Ordenação lexicográfica da matriz de dados
            listaChamada.sort((a, b) => a.nome.localeCompare(b.nome));

            desenharTabelaChamada();

        } catch (error) {
            console.error("Exceção gerada na query da turma:", error);
            // Prevenção de erro de Índice Composto do Firestore
            if (error.message.includes("index") || error.message.includes("indexes")) {
                alert("Aviso de Infraestrutura: O Firestore requer a construção de um Índice Composto para esta query. Verifique a aba Console (F12) para o link de autorização.");
            } else {
                tabelaChamada.innerHTML = '<tr><td colspan="3" class="text-center text-danger py-4">Erro interno de servidor.</td></tr>';
            }
        }
    });

    // Renderizador de inputs de rádio para controle binário (Presente/Falta)
    function desenharTabelaChamada() {
        tabelaChamada.innerHTML = '';
        
        listaChamada.forEach((aluno, index) => {
            const row = `
                <tr>
                    <td class="fw-bold text-secondary">#${aluno.matricula}</td>
                    <td>
                        ${aluno.nome}
                        ${aluno.visitante ? '<span class="badge bg-warning text-dark ms-2">Registro Provisório</span>' : ''}
                    </td>
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

    // Rotina de injeção de objeto na lista para alunos irregulares
    if (btnAddVisitante) {
        btnAddVisitante.addEventListener('click', () => {
            const inputVisitante = document.getElementById('nome-visitante');
            const nome = inputVisitante.value.trim();

            if (nome === '') {
                alert("Validação: O nome da string de visitante não pode ser vazio.");
                return;
            }

            if (listaChamada.length === 0 && !confirm("Override: Submeter entrada em matriz vazia?")) {
                return;
            }

            listaChamada.push({
                idFirebase: "temp_" + Date.now(), 
                nome: nome,
                matricula: "N/A",
                visitante: true
            });

            inputVisitante.value = ''; 
            desenharTabelaChamada(); 
        });
    }

    // Consolidação de dados e execução de POST na coleção de chamadas
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

            if (listaChamada.length === 0) {
                alert("Falha lógica: O vetor de presença está vazio.");
                return;
            }

            // Agregação de status via travessia do array
            let registrosDePresenca = [];
            
            listaChamada.forEach((aluno, index) => {
                const radios = document.getElementsByName(`presenca_${index}`);
                let statusFinal = "presente"; 
                for (let radio of radios) {
                    if (radio.checked) { statusFinal = radio.value; break; }
                }
                
                registrosDePresenca.push({
                    id_aluno: aluno.idFirebase,
                    nome: aluno.nome,
                    matricula: aluno.matricula,
                    visitante: aluno.visitante,
                    status: statusFinal 
                });
            });

            // Tratamento visual para prevenir múltiplos envios (Debounce)
            btnSalvarChamada.innerText = "SUBMETENDO PAYLOAD...";
            btnSalvarChamada.disabled = true;

            try {
                // Efetua a gravação do documento de chamada (Document Creation)
                await addDoc(collection(db, "chamadas"), {
                    data: data,
                    polo: polo, // Vincula a chamada à unidade correspondente
                    turma: turma,
                    professor: prof,
                    disciplina: disc,
                    alunos: registrosDePresenca,
                    data_registro: new Date()
                });

                alert("Transação efetuada: Documento de presença persistido na base de dados.");
                
                // Limpeza do contexto de memória e DOM
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
    // Parsing de Query String para identificação do documento
    const urlParams = new URLSearchParams(window.location.search);
    const alunoId = urlParams.get('id');

    // Funções utilitárias clonadas para o escopo local de edição
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

    // Leitura individual do documento (GET por ID)
    async function carregarDadosDoAluno(id) {
        try {
            const docRef = doc(db, "alunos", id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const aluno = docSnap.data();
                
                // Inserção dos dados nos nodos do DOM
                document.getElementById('edit-id').value = id;
                document.getElementById('edit-nome').value = aluno.nome_completo;
                document.getElementById('edit-email').value = aluno.email;
                document.getElementById('edit-cpf').value = aluno.cpf;
                document.getElementById('edit-polo').value = aluno.polo;
                document.getElementById('edit-turma').value = aluno.turma;
                document.getElementById('edit-status').value = aluno.status;

                // Processo assíncrono para cálculo demográfico do aluno
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

    // Engine analítica para cálculo histórico de frequência (Map/Reduce simplificado)
    async function calcularFrequenciaDoAluno(idAluno, turmaAluno) {
        try {
            // Varredura da coleção 'chamadas' pertinente à turma
            const q = query(collection(db, "chamadas"), where("turma", "==", turmaAluno));
            const chamadasSnapshot = await getDocs(q);

            let totalAulas = 0;
            let presencas = 0;
            let faltas = 0;

            chamadasSnapshot.forEach((chamadaDoc) => {
                const chamadaData = chamadaDoc.data();
                totalAulas++; 

                // Extração do sub-documento correspondente ao aluno iterado
                const registroDoAluno = chamadaData.alunos.find(a => a.id_aluno === idAluno);
                
                if (registroDoAluno) {
                    if (registroDoAluno.status === "presente") {
                        presencas++;
                    } else if (registroDoAluno.status === "falta") {
                        faltas++;
                    }
                }
            });

            // Derivação estátistica
            let porcentagem = 0;
            if (totalAulas > 0) {
                porcentagem = Math.round((presencas / totalAulas) * 100);
            }

            // Atualização de dashboard individual do aluno
            document.getElementById('display-total-aulas').innerText = totalAulas;
            document.getElementById('display-presencas').innerText = presencas;
            document.getElementById('display-faltas').innerText = faltas;
            document.getElementById('display-porcentagem').innerText = `${porcentagem}%`;

            // Lógica visual baseada em métrica de risco de evasão
            const circle = document.getElementById('display-porcentagem').parentElement;
            if (porcentagem >= 75) {
                circle.style.borderColor = "var(--ativo-bg)"; 
            } else if (porcentagem >= 50) {
                circle.style.borderColor = "#f8c300"; 
            } else {
                circle.style.borderColor = "var(--inativo-bg)"; 
            }

        } catch (error) {
            console.error("Falha no serviço de análise de frequência:", error);
        }
    }

    // Handler de atualização de dados (PATCH parcial)
    formEditarAluno.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const cpfDigitado = document.getElementById('edit-cpf').value;

        if (!validarCPF(cpfDigitado)) {
            alert("Falha de Validação: O CPF retornado não atende aos critérios algorítmicos.");
            document.getElementById('edit-cpf').focus();
            return;
        }

        const btnSalvar = document.getElementById('btn-salvar-edicao');
        btnSalvar.innerText = "ATUALIZANDO...";
        btnSalvar.disabled = true;

        try {
            const alunoRef = doc(db, "alunos", alunoId);
            
            // Submissão do payload formatado
            await updateDoc(alunoRef, {
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
            console.error("Exceção na atualização do documento:", error);
            alert("Erro I/O durante atualização: " + error.message);
        } finally {
            btnSalvar.innerText = "SALVAR ALTERAÇÕES";
            btnSalvar.disabled = false;
        }
    });

    // Handler de exclusão de documento (DELETE)
    const btnExcluir = document.getElementById('btn-excluir-aluno');
    if (btnExcluir) {
        btnExcluir.addEventListener('click', async () => {
            const confirmacao = confirm("CUIDADO: Confirma o soft-delete ou hard-delete deste documento? Esta operação do Firestore é irreversível.");
            
            if (confirmacao) {
                try {
                    await deleteDoc(doc(db, "alunos", alunoId));
                    alert("Documento expurgado com sucesso.");
                    window.location.href = "consultaAluno.html"; 
                } catch (error) {
                    console.error("Exceção na deleção:", error);
                    alert("Erro no expurgo do registro: " + error.message);
                }
            }
        });
    }
}

// ==========================================
// MÓDULO 6: ROLE-BASED ACCESS CONTROL E DASHBOARD GLOBAL/ALUNO
// ==========================================
const greetingDisplay = document.getElementById('user-greeting-display');

// Elementos da View Admin
const adminDashboardCards = document.getElementById('admin-dashboard-cards');
const displayAtivos = document.getElementById('dash-ativos');
const displayInativos = document.getElementById('dash-inativos');
const displayAulas = document.getElementById('dash-aulas');
const displayTotalAlunos = document.getElementById('dash-total-alunos');

// Elementos da View Aluno
const alunoDashboardCards = document.getElementById('aluno-dashboard-cards');

// Escuta reativa do Auth State para definição de acessos (Middleware local)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            let nomeExibicao = "";
            let cargoUsuario = "Aluno"; // Role de fallback (Mínimo Privilégio)
            let turmaAlunoLogado = ""; 
            
            // Leitura na coleção de staff (Administradores/Professores)
            const docFuncRef = doc(db, "funcionarios", user.uid);
            const docFuncSnap = await getDoc(docFuncRef);
            
            if (docFuncSnap.exists()) {
                const dadosFunc = docFuncSnap.data();
                nomeExibicao = dadosFunc.nome_completo;
                cargoUsuario = dadosFunc.nivel_acesso; 
            } else {
                // Leitura secundária em caso de miss na coleção primária
                const docAlunoRef = doc(db, "alunos", user.uid);
                const docAlunoSnap = await getDoc(docAlunoRef);
                
                if (docAlunoSnap.exists()) {
                    const dadosAluno = docAlunoSnap.data();
                    nomeExibicao = dadosAluno.nome_completo;
                    cargoUsuario = "Aluno"; 
                    turmaAlunoLogado = dadosAluno.turma; // Guarda a turma para o cálculo
                }
            }
            
            // Garantia de acesso para superuser/owner caso não catalogado
            if (!nomeExibicao) {
                nomeExibicao = user.email.split('@')[0];
                cargoUsuario = "Administrador"; 
            }
            
            const pathAtual = window.location.pathname.toLowerCase();
            const isDashboardPage = pathAtual.includes('dashboard.html') || pathAtual === '/' || pathAtual === '';

            // Lógica de bloqueio e Views: Perfil Aluno
            if (cargoUsuario === "Aluno") {
                document.querySelectorAll('.admin-only, .prof-admin-only, .prof-only').forEach(el => el.style.display = 'none');
                
                if (pathAtual.includes('administração') || pathAtual.includes('alunos') || pathAtual.includes('presenca.html')) {
                    alert("403 Forbidden: Privilégios insuficientes de visualização.");
                    window.location.href = "/dashboard.html"; 
                }

                // Habilita a View do Aluno no Dashboard
                if (isDashboardPage) {
                    if (adminDashboardCards) adminDashboardCards.style.display = 'none';
                    if (alunoDashboardCards) alunoDashboardCards.style.display = 'flex';
                    carregarEstatisticasAluno(user.uid, turmaAlunoLogado);
                }
            } 
            // Lógica de bloqueio e Views: Perfil Docente
            else if (cargoUsuario === "Professor") {
                document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
                
                if (pathAtual.includes('administração') || pathAtual.includes('novoaluno') || pathAtual.includes('editaraluno')) {
                    alert("403 Forbidden: Acesso administrativo exigido.");
                    window.location.href = "/dashboard.html"; 
                }

                // Habilita a View Global no Dashboard
                if (isDashboardPage) {
                    if (alunoDashboardCards) alunoDashboardCards.style.display = 'none';
                    if (adminDashboardCards) adminDashboardCards.style.display = 'flex';
                    if (displayAtivos) carregarEstatisticasDashboard();
                }
            }
            // Lógica de bloqueio e Views: Perfil Administrador
            else if (cargoUsuario === "Administrador") {
                document.querySelectorAll('.prof-only').forEach(el => el.style.display = 'none');
                
                if (pathAtual.includes('presenca.html')) {
                    alert("Restrição Estrutural: Interface dedicada a docentes.");
                    window.location.href = "/dashboard.html"; 
                }

                // Habilita a View Global no Dashboard
                if (isDashboardPage) {
                    if (alunoDashboardCards) alunoDashboardCards.style.display = 'none';
                    if (adminDashboardCards) adminDashboardCards.style.display = 'flex';
                    if (displayAtivos) carregarEstatisticasDashboard();
                }
            }

            // Bind do Header
            if (greetingDisplay) {
                const primeiroNome = nomeExibicao.split(' ')[0];
                greetingDisplay.innerText = `OLÁ, ${primeiroNome.toUpperCase()}!`;
            }
            
        } catch (error) {
            console.error("Falha na resolução do payload de acesso:", error);
        }
    } else {
        // Redirecionamento obrigatório para root em caso de unauthenticated state
        if(!window.location.pathname.includes('index.html') && window.location.pathname !== '/' && window.location.pathname !== '') {
            window.location.href = "/index.html"; 
        }
    }
});

// Consumo de documentos para geração das views quantitativas da Administração
async function carregarEstatisticasDashboard() {
    try {
        const alunosSnapshot = await getDocs(collection(db, "alunos"));
        let totalAtivos = 0;
        let totalInativos = 0;
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

// Engine analítica isolada para o Dashboard Pessoal do Aluno
async function carregarEstatisticasAluno(idAluno, turmaAluno) {
    try {
        // Varredura da coleção 'chamadas' pertinente à turma do aluno logado
        const q = query(collection(db, "chamadas"), where("turma", "==", turmaAluno));
        const chamadasSnapshot = await getDocs(q);

        let totalAulas = 0;
        let presencas = 0;
        let faltas = 0;

        chamadasSnapshot.forEach((chamadaDoc) => {
            const chamadaData = chamadaDoc.data();
            totalAulas++; 

            // Extração do sub-documento correspondente ao aluno
            const registroDoAluno = chamadaData.alunos.find(a => a.id_aluno === idAluno);
            
            if (registroDoAluno) {
                if (registroDoAluno.status === "presente") {
                    presencas++;
                } else if (registroDoAluno.status === "falta") {
                    faltas++;
                }
            }
        });

        // Derivação estatística
        let porcentagem = 0;
        if (totalAulas > 0) {
            porcentagem = Math.round((presencas / totalAulas) * 100);
        }

        // Renderização na Interface Pessoal
        document.getElementById('dash-aluno-total-aulas').innerText = totalAulas;
        document.getElementById('dash-aluno-presencas').innerText = presencas;
        document.getElementById('dash-aluno-faltas').innerText = faltas;
        document.getElementById('dash-aluno-porcentagem').innerText = `${porcentagem}%`;

        // Lógica visual baseada em métrica de risco de evasão
        const circle = document.getElementById('dash-aluno-porcentagem').parentElement;
        if (porcentagem >= 75) {
            circle.style.borderColor = "var(--ativo-bg)"; 
        } else if (porcentagem >= 50) {
            circle.style.borderColor = "#f8c300"; 
        } else {
            circle.style.borderColor = "var(--inativo-bg)"; 
        }

    } catch (error) {
        console.error("Falha no serviço de análise de frequência pessoal:", error);
    }
}

// ==========================================
// MÓDULO 7: CRIAÇÃO DE FUNCIONÁRIOS/STAFF (cadastroUsuario.html)
// ==========================================
const formNovoUsuario = document.getElementById('form-novo-usuario');

if (formNovoUsuario) {
    const inputCpfUsuario = document.getElementById('cpf-usuario');
    const inputCelularUsuario = document.getElementById('celular-usuario');

    // Utilitários isolados de Regex e Match
    const aplicarMascaraCPF = (event) => {
        let value = event.target.value.replace(/\D/g, ""); 
        if (value.length > 11) value = value.slice(0, 11); 
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        event.target.value = value;
    };

    const aplicarMascaraCelular = (event) => {
        let v = event.target.value.replace(/\D/g, ""); 
        v = v.substring(0, 11); 
        if (v.length > 10) {
            v = v.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
        } else if (v.length > 6) {
            v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
        } else if (v.length > 2) {
            v = v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
        }
        event.target.value = v;
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

    // Binding dos componentes
    if (inputCpfUsuario) {
        inputCpfUsuario.setAttribute('maxlength', '14');
        inputCpfUsuario.addEventListener('input', aplicarMascaraCPF);
    }

    if (inputCelularUsuario) {
        inputCelularUsuario.setAttribute('maxlength', '15');
        inputCelularUsuario.addEventListener('input', aplicarMascaraCelular);
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

        // Análise de Consistência
        if (!validarCPF(cpf)) {
            alert("Restrição impeditiva: O CPF inserido está incorreto do ponto de vista algorítmico.");
            document.getElementById('cpf-usuario').focus();
            return;
        }

        if (acesso === "Selecione a permissão..." || polo === "" || polo === "Selecione o polo...") {
            alert("Erro de sintaxe de dados: É imperativo que Nível de Acesso e Polo sejam selecionados.");
            return;
        }

        const btnSalvar = document.getElementById('btn-salvar-usuario');
        btnSalvar.innerText = "PROCESSANDO...";
        btnSalvar.disabled = true;

        // Criação de perfil via App Secundário
        createUserWithEmailAndPassword(authCadastro, email, senha)
            .then((userCredential) => {
                const userFuncionario = userCredential.user;
                
                // Gravação do objeto de perfil na coleção respectiva
                return setDoc(doc(db, "funcionarios", userFuncionario.uid), {
                    nome_completo: nome,
                    email: email,
                    cpf: cpf,
                    cargo: cargo,
                    celular: celular,
                    nivel_acesso: acesso,
                    polo: polo,
                    status: "ativo",
                    data_cadastro: new Date()
                });
            })
            .then(() => {
                alert("Funcionário provisionado com sucesso.");
                formNovoUsuario.reset(); 
            })
            .catch((error) => {
                if(error.code === 'auth/email-already-in-use') {
                    alert("Constraint Violation: E-mail em uso por outro documento.");
                } else if (error.code === 'auth/weak-password') {
                    alert("Política de Segurança: A complexidade da senha está abaixo do mínimo exigido (6 posições).");
                } else {
                    alert("Falha sistêmica durante criação: " + error.message);
                }
            })
            .finally(() => {
                btnSalvar.innerText = "Salvar Usuário";
                btnSalvar.disabled = false;
            });
    });
}

// ==========================================
// MÓDULO 8: CONSULTA E GERENCIAMENTO DE STAFF (consultaUsuario.html)
// ==========================================
const tabelaUsuarios = document.getElementById('tabela-usuarios');

if (tabelaUsuarios) {
    const inputBuscaUsuario = document.getElementById('busca-nome-usuario');
    const selectCargoUsuario = document.getElementById('filtro-cargo-usuario');
    const selectPoloUsuario = document.getElementById('filtro-polo-usuario');
    const selectStatusUsuario = document.getElementById('filtro-status-usuario');

    let listaDeUsuarios = []; 

    // Disparo primário do fetch
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

    // Geração de fragmentos do DOM
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
                    <td>
                        <span class="badge ${usuario.status === 'ativo' ? 'bg-success' : 'bg-danger'}">
                            ${usuario.status ? usuario.status.toUpperCase() : 'ATIVO'}
                        </span>
                    </td>
                    <td class="admin-only">
                        <a href="editarUsuario.html?id=${usuario.idFirebase}" class="btn btn-sm btn-outline-secondary" title="Configurar Referência"><i class="bi bi-pencil"></i></a>
                    </td>
                </tr>
            `;
            tabelaUsuarios.innerHTML += row;
        });
    }

    // Engine de busca reativa via manipulação de Array
    function aplicarFiltrosUsuarios() {
        let filtrados = listaDeUsuarios;

        if (inputBuscaUsuario && inputBuscaUsuario.value.trim() !== '') {
            const termo = inputBuscaUsuario.value.toLowerCase();
            filtrados = filtrados.filter(u => 
                u.nome_completo.toLowerCase().includes(termo) || 
                (u.cpf && u.cpf.includes(termo))
            );
        }

        if (selectCargoUsuario && selectCargoUsuario.value !== "todos") {
            filtrados = filtrados.filter(u => u.nivel_acesso === selectCargoUsuario.value);
        }

        if (selectPoloUsuario && selectPoloUsuario.value !== "todos" && selectPoloUsuario.value !== "") {
            filtrados = filtrados.filter(u => u.polo === selectPoloUsuario.value);
        }

        if (selectStatusUsuario && selectStatusUsuario.value !== "todos") {
            filtrados = filtrados.filter(u => u.status === selectStatusUsuario.value);
        }

        desenharTabelaUsuarios(filtrados);
    }

    // Escuta de modificações na árvore do DOM
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
        alert("Sinal de Falha: Parâmetro URLausente.");
        window.location.href = "consultaUsuario.html"; 
    } else {
        carregarDadosDoUsuario(usuarioId);
    }

    // Scripts de restrição de input baseados em máscara
    const aplicarMascaraCPF = (event) => {
        let value = event.target.value.replace(/\D/g, ""); 
        if (value.length > 11) value = value.slice(0, 11); 
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        event.target.value = value;
    };

    const aplicarMascaraCelular = (event) => {
        let v = event.target.value.replace(/\D/g, ""); 
        v = v.substring(0, 11); 
        if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
        else if (v.length > 6) v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
        else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
        event.target.value = v;
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

    document.getElementById('edit-cpf-usuario').addEventListener('input', aplicarMascaraCPF);
    document.getElementById('edit-celular-usuario').addEventListener('input', aplicarMascaraCelular);

    async function carregarDadosDoUsuario(id) {
        try {
            const docRef = doc(db, "funcionarios", id);
            const docSnap = await getDoc(docRef);

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
                alert("Erro: ID fantasma (Documento Inexistente).");
                window.location.href = "consultaUsuario.html";
            }
        } catch (error) {
            console.error("Erro no processamento do fetch GET:", error);
            alert("Rompimento de comunicação com o Firestore.");
        }
    }

    formEditarUsuario.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const cpfDigitado = document.getElementById('edit-cpf-usuario').value;
        if (!validarCPF(cpfDigitado)) {
            alert("Exceção na validação: Numeral inválido.");
            return;
        }

        const btnSalvar = document.getElementById('btn-salvar-edicao-usuario');
        btnSalvar.innerText = "ATUALIZANDO...";
        btnSalvar.disabled = true;

        try {
            const usuarioRef = doc(db, "funcionarios", usuarioId);
            
            // Submissão de update parcial no documento
            await updateDoc(usuarioRef, {
                nome_completo: document.getElementById('edit-nome-usuario').value,
                email: document.getElementById('edit-email-usuario').value,
                cpf: cpfDigitado,
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
            const confirmacao = confirm("OPERAÇÃO DE RISCO: A deleção deste nó é irreversível. Prosseguir?");
            if (confirmacao) {
                try {
                    await deleteDoc(doc(db, "funcionarios", usuarioId));
                    alert("Aviso do Servidor: Deleção efetuada (200 OK).");
                    window.location.href = "consultaUsuario.html"; 
                } catch (error) {
                    console.error("Exceção não tratada na deleção:", error);
                    alert("O sistema falhou ao expurgar o nó: " + error.message);
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
            // Empacotamento das propriedades do objeto
            const dadosPolo = {
                nome: document.getElementById('nome-polo').value,
                cep: document.getElementById('cep-polo').value,
                endereco: document.getElementById('endereco-polo').value,
                numero: document.getElementById('numero-polo').value,
                bairro: document.getElementById('bairro-polo').value,
                cidade: document.getElementById('cidade-polo').value,
                responsavel: document.getElementById('responsavel-polo').value,
                status: "ativo", 
                data_cadastro: new Date()
            };

            // Disparo assíncrono para criação automática de ID de coleção
            await addDoc(collection(db, "polos"), dadosPolo);

            alert("Registro gerado. Nova unidade indexada na rede.");
            formNovoPolo.reset(); 

        } catch (error) {
            console.error("Falha no método POST na coleção Polos:", error);
            alert("Ocorreu um throw: " + error.message);
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
            
            querySnapshot.forEach((doc) => {
                listaPolos.push({ idFirebase: doc.id, ...doc.data() });
            });
            
            desenharTabelaPolos();
        } catch (error) {
            console.error("Falha na captura do pool de polos:", error);
            tabelaPolos.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Erro fatal na extração do banco.</td></tr>`;
        }
    }

    function desenharTabelaPolos() {
        const termoBusca = document.getElementById('busca-nome-polo').value.toLowerCase();
        const filtroStatus = document.getElementById('filtro-status-polo').value;

        tabelaPolos.innerHTML = '';

        // Condicional lógica de triagem na string base (Nome OR Cidade)
        const polosFiltrados = listaPolos.filter(polo => {
            const matchNomeOuCidade = (polo.nome && polo.nome.toLowerCase().includes(termoBusca)) || 
                                      (polo.cidade && polo.cidade.toLowerCase().includes(termoBusca));
            const matchStatus = filtroStatus === 'todos' || polo.status === filtroStatus;
            
            return matchNomeOuCidade && matchStatus;
        });

        if (polosFiltrados.length === 0) {
            tabelaPolos.innerHTML = `<tr><td colspan="5" class="text-center py-4" style="color: var(--text-light);">Array vazio após aplicação dos filtros.</td></tr>`;
            return;
        }

        polosFiltrados.forEach(polo => {
            const tr = document.createElement('tr');
            
            let badgeStatus = polo.status === 'ativo' 
                ? '<span class="badge bg-success" style="font-size: 0.75rem; padding: 5px 10px; letter-spacing: 1px;">ATIVO</span>' 
                : '<span class="badge bg-danger" style="font-size: 0.75rem; padding: 5px 10px; letter-spacing: 1px;">INATIVO</span>';

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

    // Declaração dos event listeners locais
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
            if (polo.status === 'ativo') {
                polosAtivos.push(polo.nome);
            }
        });

        polosAtivos.sort();

        selectsPolos.forEach(select => {
            const valorSalvo = select.value;
            select.innerHTML = ''; 

            // Telas de Filtro (Consulta)
            if (select.id.includes('filtro')) {
                // Ação de mostrar a lista inteira
                select.innerHTML = '<option value="todos">Mostrar Todos os Polos</option>';
                
                // Opção para filtrar e achar especificamente os funcionários globais
                if (select.id === 'filtro-polo-usuario') {
                    select.innerHTML += '<option value="Global"> Apenas Funcionários Globais</option>';
                }
            } 
            // Telas de Formulário (Cadastro/Edição)
            else {
                select.innerHTML = '<option value="" disabled>Selecione a alocação...</option>';
                
                // Permite atribuir o cargo "Global" na criação/edição de funcionários
                if (select.id === 'edit-polo-usuario' || select.id === 'polo-usuario') {
                    select.innerHTML += '<option value="Global"> Atuação Global (Rede Completa)</option>';
                }
            }

            polosAtivos.forEach(nomePolo => {
                select.innerHTML += `<option value="${nomePolo}">${nomePolo}</option>`;
            });

            // Tratamento de compatibilidade para quem já estava salvo com o nome antigo
            if (valorSalvo && !valorSalvo.includes('Carregando') && valorSalvo !== '') {
                if (valorSalvo === "Todos os Polos (Global)") {
                    select.value = "Global";
                } else {
                    select.value = valorSalvo;
                }
            }
        });

    } catch (error) {
        console.error("Falha do parser dinâmico na requisição da lista de polos:", error);
    }
}

// Initializer do middleware
preencherPolosDinamicos();

// ==========================================
// MÓDULO 13: ATUALIZAÇÃO E EXCLUSÃO DE POLOS (editarPolo.html)
// ==========================================
const formEditarPolo = document.getElementById('form-editar-polo');

if (formEditarPolo) {
    const urlParams = new URLSearchParams(window.location.search);
    const poloId = urlParams.get('id');

    if (!poloId) {
        alert("Erro de Roteamento: ID da unidade não identificado na URL.");
        window.location.href = "consultaPolo.html";
    } else {
        carregarDadosDoPolo(poloId);
    }

    // Leitura do documento selecionado
    async function carregarDadosDoPolo(id) {
        try {
            const docRef = doc(db, "polos", id);
            const docSnap = await getDoc(docRef);

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
                alert("Erro 404: A unidade não foi encontrada no banco de dados.");
                window.location.href = "consultaPolo.html";
            }
        } catch (error) {
            console.error("Falha na leitura do Polo (GET):", error);
            alert("Erro na comunicação com a infraestrutura de dados.");
        }
    }

    // Submissão do formulário de atualização (PATCH)
    formEditarPolo.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btnSalvar = document.getElementById('btn-salvar-edicao-polo');
        btnSalvar.innerText = "ATUALIZANDO PAYLOAD...";
        btnSalvar.disabled = true;

        try {
            const poloRef = doc(db, "polos", poloId);

            await updateDoc(poloRef, {
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
            alert("Falha na gravação dos dados: " + error.message);
        } finally {
            btnSalvar.innerText = "Salvar Alterações";
            btnSalvar.disabled = false;
        }
    });

    // Rotina de exclusão do documento (DELETE)
    const btnExcluirPolo = document.getElementById('btn-excluir-polo');
    if (btnExcluirPolo) {
        btnExcluirPolo.addEventListener('click', async () => {
            const confirmacao = confirm("ATENÇÃO MÁXIMA: Excluir este polo pode gerar inconsistência nos alunos e funcionários vinculados a ele. Confirma a exclusão?");
            
            if (confirmacao) {
                try {
                    await deleteDoc(doc(db, "polos", poloId));
                    alert("Operação concluída: Unidade expurgada do sistema.");
                    window.location.href = "consultaPolo.html";
                } catch (error) {
                    console.error("Exceção ao deletar polo:", error);
                    alert("Falha na exclusão do documento: " + error.message);
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
    let listaHistorico = []; // Array de cache para evitar múltiplas requisições ao banco

    // 1. Carrega toda a coleção de chamadas ao abrir a página
    async function carregarHistoricoNoBanco() {
        tabelaHistorico.innerHTML = '<tr><td colspan="6" class="text-center py-4">Sincronizando registros com o banco de dados...</td></tr>';
        
        try {
            const querySnapshot = await getDocs(collection(db, "chamadas"));
            listaHistorico = [];
            
            querySnapshot.forEach((doc) => {
                listaHistorico.push({ idFirebase: doc.id, ...doc.data() });
            });

            // Ordena os relatórios decrescente (do mais recente para o mais antigo)
            listaHistorico.sort((a, b) => new Date(b.data) - new Date(a.data));
            
            aplicarFiltrosHistorico(); // Desenha a tabela com os dados

        } catch (error) {
            console.error("Falha na extração do histórico de chamadas:", error);
            tabelaHistorico.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Erro de comunicação com o servidor Firestore.</td></tr>';
        }
    }

    // 2. Lógica de Filtragem (Data, Polo e Turma)
    function aplicarFiltrosHistorico() {
        const dataInicio = document.getElementById('busca-data-inicio').value;
        const dataFim = document.getElementById('busca-data-fim').value;
        const filtroPolo = document.getElementById('filtro-polo').value;
        const filtroTurma = document.getElementById('filtro-turma').value;

        let filtrados = listaHistorico;

        // Filtro por range de datas
        if (dataInicio) {
            filtrados = filtrados.filter(chamada => chamada.data >= dataInicio);
        }
        if (dataFim) {
            filtrados = filtrados.filter(chamada => chamada.data <= dataFim);
        }

        // Filtro por unidade (ignora se estiver no placeholder "todos" ou vazio)
        if (filtroPolo && filtroPolo !== "todos" && filtroPolo !== "") {
            filtrados = filtrados.filter(chamada => chamada.polo === filtroPolo);
        }

        // Filtro por turma
        if (filtroTurma && filtroTurma !== "todos") {
            filtrados = filtrados.filter(chamada => chamada.turma === filtroTurma);
        }

        desenharTabelaHistorico(filtrados);
    }

    // 3. Renderização do DOM (Tabela Principal) - ATUALIZADO COM BOTÃO EDITAR
    function desenharTabelaHistorico(dadosParaMostrar) {
        tabelaHistorico.innerHTML = '';

        if (dadosParaMostrar.length === 0) {
            tabelaHistorico.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Nenhum registro atende aos critérios do filtro.</td></tr>';
            return;
        }

        dadosParaMostrar.forEach(chamada => {
            // Conversão de formato de data padrão (YYYY-MM-DD para DD/MM/YYYY)
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
                        <a href="editarChamada.html?id=${chamada.idFirebase}" class="btn btn-sm btn-outline-secondary px-3" title="Editar Registro / Excluir">
                            <i class="bi bi-pencil"></i>
                        </a>
                    </div>
                </td>
            `;
            tabelaHistorico.appendChild(tr);
        });
    }

    // 4. Injeção de Dados no Componente Modal (Visão de Impressão)
    window.abrirRelatorio = function(idFirebase) {
        const chamada = listaHistorico.find(c => c.idFirebase === idFirebase);
        
        if (!chamada) {
            alert("Erro de consistência: Documento não localizado na memória.");
            return;
        }

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
    let dadosAlunosEdicao = []; // Cache local da lista de presença daquela aula

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

        // Captura os novos status de presença marcados nos rádios
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