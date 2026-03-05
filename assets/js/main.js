// 1. Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, getDocs, query, where, addDoc} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 2. Configurações de autenticação do projeto Libertar
const firebaseConfig = {
  apiKey: "AIzaSyBlZj_j8WZC4fALp9aPhzNyaXZaqrsoVqs",
  authDomain: "libertarbd.firebaseapp.com",
  projectId: "libertarbd",
  storageBucket: "libertarbd.firebasestorage.app",
  messagingSenderId: "989803267776",
  appId: "1:989803267776:web:4227525600b40d38d70f25"
};

// 3. Inicialização do Firebase Principal (Autenticação e Banco de Dados)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 4. Inicialização do projeto secundário (Permite cadastros sem alterar a sessão atual)
const appCadastro = initializeApp(firebaseConfig, "AppParaCadastros");
const authCadastro = getAuth(appCadastro);

// ==========================================
// MÓDULO 1: AUTENTICAÇÃO E RECUPERAÇÃO DE SENHA (index.html)
// ==========================================
const formLogin = document.getElementById('form-login');

if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault(); 

        const email = document.getElementById('email-login').value;
        const senha = document.getElementById('senha-login').value;

        // Autenticação de usuário no Firebase
        signInWithEmailAndPassword(auth, email, senha)
            .then((userCredential) => {
                // Redirecionamento para o painel de controle
                window.location.href = "dashboard.html"; 
            })
            .catch((error) => {
                if(error.code === 'auth/invalid-credential') {
                    alert("Acesso negado: E-mail ou senha incorretos.");
                } else {
                    alert("Erro de autenticação: " + error.message);
                }
            });
    });


    const btnEnviarRecuperacao = document.getElementById('btn-enviar-recuperacao');

    if (btnEnviarRecuperacao) {
        btnEnviarRecuperacao.addEventListener('click', () => {
            // Obtém o endereço de e-mail informado no Modal
            const emailParaReset = document.getElementById('email-recuperacao').value;

            if (!emailParaReset) {
                alert("Por favor, informe um endereço de e-mail válido.");
                return;
            }

            // Atualização do estado do botão durante a requisição
            btnEnviarRecuperacao.innerText = "Processando...";
            btnEnviarRecuperacao.disabled = true;

            sendPasswordResetEmail(auth, emailParaReset)
                .then(() => {
                    alert("Instruções de redefinição de senha enviadas. Verifique sua caixa de entrada.");
                    
                    // Oculta o Modal do Bootstrap após o envio
                    const modalElement = document.getElementById('modalEsqueciSenha');
                    const modalInstance = bootstrap.Modal.getInstance(modalElement);
                    modalInstance.hide();
                    
                    // Limpeza do campo de entrada
                    document.getElementById('email-recuperacao').value = '';
                })
                .catch((error) => {
                    if (error.code === 'auth/invalid-email') {
                        alert("Erro: O formato do e-mail informado é inválido.");
                    } else if (error.code === 'auth/user-not-found' || error.code === 'auth/missing-email') {
                        alert("Erro: O e-mail informado não consta em nossos registros.");
                    } else {
                        alert("Falha ao enviar solicitação: " + error.message);
                    }
                })
                .finally(() => {
                    // Restauração do estado inicial do botão
                    btnEnviarRecuperacao.innerText = "Enviar Link";
                    btnEnviarRecuperacao.disabled = false;
                });
        });
    }
}

// ==========================================
// MÓDULO 2: CADASTRO DE ALUNOS (novoAluno.html)
// ==========================================
const formNovoAluno = document.getElementById('form-novo-aluno');

if (formNovoAluno) {
    formNovoAluno.addEventListener('submit', (e) => {
        e.preventDefault();

        // Coleta de dados do formulário
        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const cpf = document.getElementById('cpf').value;
        const polo = document.getElementById('polo').value;
        const turma = document.getElementById('turma').value;
        
        // Remoção de caracteres especiais do CPF para utilização como senha inicial
        const senhaInicial = cpf.replace(/\D/g, ""); 

        if(senhaInicial.length < 6) {
            alert("Erro de validação: O CPF deve estar completo para a geração da credencial de acesso.");
            return;
        }

        // Criação de credencial na instância secundária do Firebase Auth
        createUserWithEmailAndPassword(authCadastro, email, senhaInicial)
            .then((userCredential) => {
                const userAluno = userCredential.user;
                
                // Inserção dos dados cadastrais na coleção do Firestore
                return setDoc(doc(db, "alunos", userAluno.uid), {
                    nome_completo: nome,
                    email: email,
                    cpf: cpf,
                    polo: polo,
                    turma: turma,
                    status: "ativo",
                    total_presencas: 0,
                    total_faltas: 0
                });
            })
            .then(() => {
                alert("Cadastro realizado com sucesso. A senha inicial gerada corresponde aos números do CPF.");
                formNovoAluno.reset(); // Restauração do formulário
            })
            .catch((error) => {
                if(error.code === 'auth/email-already-in-use') {
                    alert("Aviso: O endereço de e-mail informado já possui cadastro ativo no sistema.");
                } else {
                    alert("Falha no processo de cadastro: " + error.message);
                }
            });
    });
}

// ==========================================
// MÓDULO 3: CONSULTA DE ALUNOS (consultaAluno.html)
// ==========================================
const tabelaAlunos = document.getElementById('tabela-alunos');

// Mapeamento dos elementos de filtro
const inputBusca = document.getElementById('busca-nome');
const selectPolo = document.getElementById('filtro-polo');
const selectTurma = document.getElementById('filtro-turma');
const selectStatus = document.getElementById('filtro-status'); 

// Array local para armazenamento de dados e otimização de requisições
let listaDeAlunos = []; 

if (tabelaAlunos) {
    // 1. Executa a requisição ao banco de dados na inicialização da página
    async function buscarAlunosNoBanco() {
        tabelaAlunos.innerHTML = '<tr><td colspan="6" class="text-center py-4">Estabelecendo conexão com o servidor...</td></tr>';
        try {
            const querySnapshot = await getDocs(collection(db, "alunos"));
            listaDeAlunos = []; 
            
            querySnapshot.forEach((doc) => {
                const aluno = doc.data();
                aluno.idFirebase = doc.id; 
                listaDeAlunos.push(aluno); 
            });

            // Renderização inicial dos dados consolidados
            desenharTabela(listaDeAlunos);

        } catch (error) {
            console.error("Falha na recuperação de dados:", error);
            tabelaAlunos.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Falha de comunicação com o banco de dados.</td></tr>';
        }
    }

    // 2. Método de construção da tabela HTML
    function desenharTabela(alunosParaMostrar) {
        tabelaAlunos.innerHTML = ''; 
        
        if(alunosParaMostrar.length === 0) {
            tabelaAlunos.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Nenhum registro correspondente aos critérios informados.</td></tr>';
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
                    <td>
                        <button class="btn btn-sm btn-outline-secondary" title="Editar Registro"><i class="bi bi-pencil"></i></button>
                    </td>
                </tr>
            `;
            tabelaAlunos.innerHTML += row;
        });
    }

    // 3. Processamento dos filtros locais
    function aplicarFiltros() {
        let alunosFiltrados = listaDeAlunos;

        // Aplicação de filtro textual (Nome ou CPF)
        if (inputBusca && inputBusca.value.trim() !== '') {
            const termo = inputBusca.value.toLowerCase();
            alunosFiltrados = alunosFiltrados.filter(aluno => 
                aluno.nome_completo.toLowerCase().includes(termo) || 
                (aluno.cpf && aluno.cpf.includes(termo))
            );
        }

        // Aplicação de filtro categórico: Polo
        if (selectPolo && selectPolo.value !== "todos") {
            alunosFiltrados = alunosFiltrados.filter(aluno => aluno.polo === selectPolo.value);
        }

        // Aplicação de filtro categórico: Turma
        if (selectTurma && selectTurma.value !== "todos") {
            alunosFiltrados = alunosFiltrados.filter(aluno => aluno.turma === selectTurma.value);
        }

        // Aplicação de filtro categórico: Status
        if (selectStatus && selectStatus.value !== "todos") {
            alunosFiltrados = alunosFiltrados.filter(aluno => aluno.status === selectStatus.value);
        }

        // Atualização da interface baseada no resultado dos filtros
        desenharTabela(alunosFiltrados);
    }

    // Vinculação de eventos (Event Listeners) aos campos de pesquisa
    if(inputBusca) inputBusca.addEventListener('input', aplicarFiltros);
    if(selectPolo) selectPolo.addEventListener('change', aplicarFiltros);
    if(selectTurma) selectTurma.addEventListener('change', aplicarFiltros);
    if(selectStatus) selectStatus.addEventListener('change', aplicarFiltros);

    // Inicializa a recuperação de dados
    buscarAlunosNoBanco();
}

// ==========================================
// MÓDULO 4: REGISTRO DE PRESENÇA (presenca.html)
// ==========================================
const btnCarregarTurma = document.getElementById('btn-carregar-turma');
const tabelaChamada = document.getElementById('tabela-chamada');
const btnAddVisitante = document.getElementById('btn-add-visitante');
const btnSalvarChamada = document.getElementById('btn-salvar-chamada');

if (btnCarregarTurma) {
    let listaChamada = []; // Armazenamento temporário da listagem diária

    // 1. Consulta de alunos baseada na turma selecionada
    btnCarregarTurma.addEventListener('click', async () => {
        const turmaSelecionada = document.getElementById('turma-chamada').value;

        if (!turmaSelecionada || turmaSelecionada === "Selecione a Turma...") {
            alert("Operação inválida: É necessário selecionar uma turma.");
            return;
        }

        tabelaChamada.innerHTML = '<tr><td colspan="3" class="text-center py-4">Consultando base de alunos...</td></tr>';

        try {
            // Consulta no Firestore filtrando por turma e status de matrícula ativo
            const q = query(collection(db, "alunos"), where("turma", "==", turmaSelecionada), where("status", "==", "ativo"));
            const querySnapshot = await getDocs(q);

            listaChamada = [];
            
            if (querySnapshot.empty) {
                tabelaChamada.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-danger">Nenhum registro de aluno ativo localizado para esta turma.</td></tr>';
                return;
            }

            // Armazenamento estruturado dos resultados
            querySnapshot.forEach((doc) => {
                const aluno = doc.data();
                listaChamada.push({
                    idFirebase: doc.id,
                    nome: aluno.nome_completo,
                    matricula: doc.id.substring(0, 5).toUpperCase(),
                    visitante: false
                });
            });

            desenharTabelaChamada();

        } catch (error) {
            console.error("Falha na consulta da turma:", error);
            tabelaChamada.innerHTML = '<tr><td colspan="3" class="text-center text-danger py-4">Erro de comunicação com o servidor.</td></tr>';
        }
    });

    // 2. Método de renderização da interface de marcação
    function desenharTabelaChamada() {
        tabelaChamada.innerHTML = '';
        
        listaChamada.forEach((aluno, index) => {
            // Definição estrutural das opções de Presença/Falta (Seleção padrão: Presente)
            const row = `
                <tr>
                    <td class="fw-bold text-secondary">#${aluno.matricula}</td>
                    <td>
                        ${aluno.nome}
                        ${aluno.visitante ? '<span class="badge bg-warning text-dark ms-2">Visitante</span>' : ''}
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

    // 3. Inclusão manual de alunos não regulares
    if (btnAddVisitante) {
        btnAddVisitante.addEventListener('click', () => {
            const inputVisitante = document.getElementById('nome-visitante');
            const nome = inputVisitante.value.trim();

            if (nome === '') {
                alert("Validação pendente: Informe o nome do aluno visitante.");
                return;
            }

            if (listaChamada.length === 0 && !confirm("Atenção: Nenhuma turma base foi carregada. Confirmar adição de visitante isolado?")) {
                return;
            }

            // Inserção do registro provisório no array ativo
            listaChamada.push({
                idFirebase: "visitante_" + Date.now(), // Identificador gerado via Timestamp
                nome: nome,
                matricula: "VISIT",
                visitante: true
            });

            inputVisitante.value = ''; 
            desenharTabelaChamada(); 
        });
    }

    // 4. Submissão e gravação do relatório no banco de dados
    if (btnSalvarChamada) {
        btnSalvarChamada.addEventListener('click', async () => {
            const data = document.getElementById('data-chamada').value;
            const turma = document.getElementById('turma-chamada').value;
            const prof = document.getElementById('prof-chamada').value.trim();
            const disc = document.getElementById('disc-chamada').value.trim();

            if (!data || turma === "Selecione a Turma..." || !prof || !disc) {
                alert("Dados incompletos: É obrigatório o preenchimento dos campos Data, Turma, Professor e Disciplina.");
                return;
            }

            if (listaChamada.length === 0) {
                alert("Operação cancelada: A lista de frequência não possui registros.");
                return;
            }

            // Processamento iterativo para determinação do status de frequência
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

            // Atualização de estado visual da submissão
            btnSalvarChamada.innerText = "PROCESSANDO TRANSAÇÃO...";
            btnSalvarChamada.disabled = true;

            try {
                // Inserção do novo documento na coleção de 'chamadas'
                await addDoc(collection(db, "chamadas"), {
                    data: data,
                    turma: turma,
                    professor: prof,
                    disciplina: disc,
                    alunos: registrosDePresenca,
                    data_registro: new Date()
                });

                alert("Operação concluída: Frequência registrada com sucesso no sistema.");
                
                // Restauração da interface pós-submissão
                document.getElementById('prof-chamada').value = '';
                document.getElementById('disc-chamada').value = '';
                document.getElementById('nome-visitante').value = '';
                listaChamada = [];
                tabelaChamada.innerHTML = '<tr><td colspan="3" class="text-center py-5 text-muted">Selecione uma turma acima e clique no botão para carregar a lista de alunos.</td></tr>';

            } catch (error) {
                console.error("Erro na gravação da chamada:", error);
                alert("Falha de persistência de dados: " + error.message);
            } finally {
                btnSalvarChamada.innerText = "SALVAR CHAMADA NO BANCO";
                btnSalvarChamada.disabled = false;
            }
        });
    }
}