// 1. Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, getDocs, query, where, addDoc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
    const inputCpfCadastro = document.getElementById('cpf');

    // Função interna isolada de Máscara de CPF
    const aplicarMascaraCPF = (event) => {
        let value = event.target.value.replace(/\D/g, ""); 
        if (value.length > 11) value = value.slice(0, 11); 
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        event.target.value = value;
    };

    // Função interna isolada de Validação Matemática
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

    // Aplicação do ouvinte de eventos ao campo
    if (inputCpfCadastro) {
        inputCpfCadastro.setAttribute('maxlength', '14');
        inputCpfCadastro.addEventListener('input', aplicarMascaraCPF);
    }

    formNovoAluno.addEventListener('submit', (e) => {
        e.preventDefault();

        // Coleta de dados do formulário
        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const cpf = document.getElementById('cpf').value;
        const polo = document.getElementById('polo').value;
        const turma = document.getElementById('turma').value;
        
        // Validação estrita do CPF antes do processamento
        if (!validarCPF(cpf)) {
            alert("Validação pendente: O CPF informado é inválido. Verifique os números digitados.");
            document.getElementById('cpf').focus();
            return;
        }

        // Remoção de caracteres especiais do CPF para utilização como senha inicial
        const senhaInicial = cpf.replace(/\D/g, ""); 

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
                        <a href="editarAluno.html?id=${aluno.idFirebase}" class="btn btn-sm btn-outline-secondary" title="Editar Registro"><i class="bi bi-pencil"></i></a>
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

// ==========================================
// MÓDULO 5: PERFIL E EDIÇÃO DE ALUNO (editarAluno.html)
// ==========================================
const formEditarAluno = document.getElementById('form-editar-aluno');

if (formEditarAluno) {
    // 1. Extração do Parâmetro ID da URL
    const urlParams = new URLSearchParams(window.location.search);
    const alunoId = urlParams.get('id');

    // Funções internas isoladas (Cópia exata para o escopo de Edição)
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
        alert("Erro de roteamento: Identificador do aluno não encontrado.");
        window.location.href = "consultaAluno.html"; 
    } else {
        carregarDadosDoAluno(alunoId);
    }

    // 2. Método de Consulta e Preenchimento Inicial
    async function carregarDadosDoAluno(id) {
        try {
            // A. Busca os dados cadastrais
            const docRef = doc(db, "alunos", id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const aluno = docSnap.data();
                
                // Preenchimento do Formulário
                document.getElementById('edit-id').value = id;
                document.getElementById('edit-nome').value = aluno.nome_completo;
                document.getElementById('edit-email').value = aluno.email;
                document.getElementById('edit-cpf').value = aluno.cpf;
                document.getElementById('edit-polo').value = aluno.polo;
                document.getElementById('edit-turma').value = aluno.turma;
                document.getElementById('edit-status').value = aluno.status;

                // B. Executa o Cálculo de Frequência
                calcularFrequenciaDoAluno(id, aluno.turma);

            } else {
                alert("Erro: O registro do aluno não foi localizado na base de dados.");
                window.location.href = "consultaAluno.html";
            }
        } catch (error) {
            console.error("Falha na recuperação de dados:", error);
            alert("Erro de comunicação com o servidor.");
        }
    }

    // 3. Lógica Analítica: Cálculo de Presença
    async function calcularFrequenciaDoAluno(idAluno, turmaAluno) {
        try {
            // Consulta todas as chamadas realizadas para a turma deste aluno
            const q = query(collection(db, "chamadas"), where("turma", "==", turmaAluno));
            const chamadasSnapshot = await getDocs(q);

            let totalAulas = 0;
            let presencas = 0;
            let faltas = 0;

            chamadasSnapshot.forEach((chamadaDoc) => {
                const chamadaData = chamadaDoc.data();
                totalAulas++; // Cada documento é uma aula ministrada

                // Procura o aluno específico dentro da lista daquela chamada
                const registroDoAluno = chamadaData.alunos.find(a => a.id_aluno === idAluno);
                
                if (registroDoAluno) {
                    if (registroDoAluno.status === "presente") {
                        presencas++;
                    } else if (registroDoAluno.status === "falta") {
                        faltas++;
                    }
                }
            });

            // Processamento da Porcentagem
            let porcentagem = 0;
            if (totalAulas > 0) {
                porcentagem = Math.round((presencas / totalAulas) * 100);
            }

            // Renderização na Interface
            document.getElementById('display-total-aulas').innerText = totalAulas;
            document.getElementById('display-presencas').innerText = presencas;
            document.getElementById('display-faltas').innerText = faltas;
            document.getElementById('display-porcentagem').innerText = `${porcentagem}%`;

            // Alteração visual da cor do gráfico com base no risco de evasão
            const circle = document.getElementById('display-porcentagem').parentElement;
            if (porcentagem >= 75) {
                circle.style.borderColor = "var(--ativo-bg)"; // Azul/Verde (Seguro)
            } else if (porcentagem >= 50) {
                circle.style.borderColor = "#f8c300"; // Amarelo (Atenção)
            } else {
                circle.style.borderColor = "var(--inativo-bg)"; // Vermelho (Crítico)
            }

        } catch (error) {
            console.error("Erro no processamento de frequência:", error);
        }
    }

    // 4. Submissão da Atualização Cadastral
    formEditarAluno.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const cpfDigitado = document.getElementById('edit-cpf').value;

        // Executa a validação antes de prosseguir
        if (!validarCPF(cpfDigitado)) {
            alert("Validação pendente: O CPF informado é inválido. Verifique os números digitados.");
            document.getElementById('edit-cpf').focus();
            return;
        }

        const btnSalvar = document.getElementById('btn-salvar-edicao');
        btnSalvar.innerText = "ATUALIZANDO...";
        btnSalvar.disabled = true;

        try {
            const alunoRef = doc(db, "alunos", alunoId);
            
            // Atualiza os campos do banco de dados (incluindo o novo e-mail editado)
            await updateDoc(alunoRef, {
                nome_completo: document.getElementById('edit-nome').value,
                email: document.getElementById('edit-email').value,
                cpf: cpfDigitado,
                polo: document.getElementById('edit-polo').value,
                turma: document.getElementById('edit-turma').value,
                status: document.getElementById('edit-status').value
            });

            alert("Operação concluída: Registro do aluno atualizado com sucesso.");
            window.location.href = "consultaAluno.html"; // Retorna para a tabela

        } catch (error) {
            console.error("Erro na atualização:", error);
            alert("Falha ao gravar alterações: " + error.message);
        } finally {
            btnSalvar.innerText = "SALVAR ALTERAÇÕES";
            btnSalvar.disabled = false;
        }
    });

    // 5. Procedimento de Exclusão de Registro
    const btnExcluir = document.getElementById('btn-excluir-aluno');
    if (btnExcluir) {
        btnExcluir.addEventListener('click', async () => {
            const confirmacao = confirm("ATENÇÃO: Tem certeza que deseja excluir permanentemente este aluno do sistema? Esta ação não poderá ser desfeita.");
            
            if (confirmacao) {
                try {
                    await deleteDoc(doc(db, "alunos", alunoId));
                    alert("Operação concluída: Registro excluído da base de dados.");
                    window.location.href = "consultaAluno.html"; // Retorna para a tabela
                } catch (error) {
                    console.error("Erro na exclusão:", error);
                    alert("Falha na exclusão do registro: " + error.message);
                }
            }
        });
    }
}
// ==========================================
// MÓDULO 6: PAINEL DE CONTROLE (dashboard.html), SAUDAÇÃO E CONTROLE DE ACESSO
// ==========================================
const greetingDisplay = document.getElementById('user-greeting-display');
const displayAtivos = document.getElementById('dash-ativos');
const displayInativos = document.getElementById('dash-inativos');
const displayAulas = document.getElementById('dash-aulas');
const displayTotalAlunos = document.getElementById('dash-total-alunos');

// 1. SISTEMA DE SEGURANÇA E CONTROLE DE ACESSO (RBAC)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            let nomeExibicao = "";
            let cargoUsuario = "Aluno"; // Começa presumindo que é Aluno (nível mais baixo)
            
            // A. Tenta achar o usuário na lista de Funcionários
            const docFuncRef = doc(db, "funcionarios", user.uid);
            const docFuncSnap = await getDoc(docFuncRef);
            
            if (docFuncSnap.exists()) {
                const dadosFunc = docFuncSnap.data();
                nomeExibicao = dadosFunc.nome_completo;
                cargoUsuario = dadosFunc.nivel_acesso; // "Administrador" ou "Professor"
            } else {
                // B. Se não achar, procura na lista de Alunos
                const docAlunoRef = doc(db, "alunos", user.uid);
                const docAlunoSnap = await getDoc(docAlunoRef);
                
                if (docAlunoSnap.exists()) {
                    nomeExibicao = docAlunoSnap.data().nome_completo;
                    cargoUsuario = "Aluno"; // Confirma que é Aluno
                }
            }
            
            // C. Fallback para a conta mestra (se não tiver cadastro)
            if (!nomeExibicao) {
                nomeExibicao = user.email.split('@')[0];
                cargoUsuario = "Administrador"; // Conta original ganha passe livre
            }
            
            // --- APLICAÇÃO DAS REGRAS REAIS DE TELA E ROTEAMENTO ---
            const pathAtual = window.location.pathname.toLowerCase();

            // REGRA 1: ALUNO
            if (cargoUsuario === "Aluno") {
                // Esconde menus de Admin e Professor
                document.querySelectorAll('.admin-only, .prof-admin-only, .prof-only').forEach(el => el.style.display = 'none');
                
                // Bloqueia acesso forçado por URL
                if (pathAtual.includes('administração') || pathAtual.includes('alunos') || pathAtual.includes('presenca.html')) {
                    alert("Acesso Negado: Sua conta de estudante não tem permissão para acessar esta área.");
                    window.location.href = "/dashboard.html"; 
                }
            } 
            // REGRA 2: PROFESSOR
            else if (cargoUsuario === "Professor") {
                // Esconde menus de Admin
                document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
                
                // Bloqueia acesso forçado por URL (não tem mais transferenciaaluno aqui)
                if (pathAtual.includes('administração') || pathAtual.includes('novoaluno') || pathAtual.includes('editaraluno')) {
                    alert("Acesso Negado: Apenas a administração pode alterar os registros da base.");
                    window.location.href = "/dashboard.html"; 
                }
            }
            // REGRA 3: ADMINISTRADOR
            else if (cargoUsuario === "Administrador") {
                // Esconde menus exclusivos de Professor
                document.querySelectorAll('.prof-only').forEach(el => el.style.display = 'none');
                
                // Bloqueia acesso forçado por URL
                if (pathAtual.includes('presenca.html')) {
                    alert("Acesso Negado: O registro de frequência é exclusivo para os Professores.");
                    window.location.href = "/dashboard.html"; 
                }
            }

            // Atualiza o nome na tela inicial
            if (greetingDisplay) {
                const primeiroNome = nomeExibicao.split(' ')[0];
                greetingDisplay.innerText = `OLÁ, ${primeiroNome.toUpperCase()}!`;
            }

            // Carrega os dados numéricos se os cards estiverem na tela (Dashboard)
            if (displayAtivos) {
                carregarEstatisticasDashboard();
            }
            
        } catch (error) {
            console.error("Erro na verificação de acesso:", error);
        }
    } else {
        // Expulsa se tentar acessar sem login (proteção básica)
        if(!window.location.pathname.includes('index.html') && window.location.pathname !== '/' && window.location.pathname !== '') {
            window.location.href = "/index.html"; 
        }
    }
});

// 2. BUSCA DE ESTATÍSTICAS NO BANCO (Apenas para o Dashboard)
async function carregarEstatisticasDashboard() {
    try {
        // Conta os alunos
        const alunosSnapshot = await getDocs(collection(db, "alunos"));
        let totalAtivos = 0;
        let totalInativos = 0;
        let totalGeral = alunosSnapshot.size;

        alunosSnapshot.forEach((doc) => {
            const aluno = doc.data();
            if (aluno.status === "ativo") totalAtivos++;
            else if (aluno.status === "inativo") totalInativos++;
        });

        // Conta as chamadas (aulas)
        const chamadasSnapshot = await getDocs(collection(db, "chamadas"));
        const totalAulas = chamadasSnapshot.size; 

        // Aplica os números no HTML
        if(displayAtivos) displayAtivos.innerText = totalAtivos;
        if(displayInativos) displayInativos.innerText = totalInativos;
        if(displayTotalAlunos) displayTotalAlunos.innerText = totalGeral;
        if(displayAulas) displayAulas.innerText = totalAulas;

    } catch (error) {
        console.error("Falha ao carregar métricas:", error);
        if(displayAtivos) displayAtivos.innerText = "!";
        if(displayInativos) displayInativos.innerText = "!";
        if(displayTotalAlunos) displayTotalAlunos.innerText = "!";
        if(displayAulas) displayAulas.innerText = "!";
    }
}

// ==========================================
// MÓDULO 7: CADASTRO DE FUNCIONÁRIOS (cadastroUsuario.html)
// ==========================================
const formNovoUsuario = document.getElementById('form-novo-usuario');

if (formNovoUsuario) {
    const inputCpfUsuario = document.getElementById('cpf-usuario');
    const inputCelularUsuario = document.getElementById('celular-usuario');

    // Funções internas isoladas de formatação e validação
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

    // Aplicação dos ouvintes (Listeners)
    if (inputCpfUsuario) {
        inputCpfUsuario.setAttribute('maxlength', '14');
        inputCpfUsuario.addEventListener('input', aplicarMascaraCPF);
    }

    if (inputCelularUsuario) {
        inputCelularUsuario.setAttribute('maxlength', '15');
        inputCelularUsuario.addEventListener('input', aplicarMascaraCelular);
    }

    // Processamento do Formulário
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

        // Validação de Integridade
        if (!validarCPF(cpf)) {
            alert("Validação pendente: O CPF informado é inválido. Verifique os números digitados.");
            document.getElementById('cpf-usuario').focus();
            return;
        }

        if (acesso === "Selecione a permissão..." || polo === "Selecione o polo...") {
            alert("Dados incompletos: Selecione o Nível de Acesso e o Polo Vinculado.");
            return;
        }

        // Feedback visual de carregamento
        const btnSalvar = document.getElementById('btn-salvar-usuario');
        btnSalvar.innerText = "PROCESSANDO...";
        btnSalvar.disabled = true;

        // Criação na base de dados
        createUserWithEmailAndPassword(authCadastro, email, senha)
            .then((userCredential) => {
                const userFuncionario = userCredential.user;
                
                // Salva na coleção exclusiva de funcionários
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
                alert("Cadastro realizado com sucesso. O funcionário já possui credenciais de acesso.");
                formNovoUsuario.reset(); 
            })
            .catch((error) => {
                if(error.code === 'auth/email-already-in-use') {
                    alert("Aviso: O endereço de e-mail informado já possui cadastro ativo no sistema.");
                } else if (error.code === 'auth/weak-password') {
                    alert("Aviso de Segurança: A senha inicial deve conter pelo menos 6 caracteres.");
                } else {
                    alert("Falha no processo de cadastro: " + error.message);
                }
            })
            .finally(() => {
                btnSalvar.innerText = "Salvar Usuário";
                btnSalvar.disabled = false;
            });
    });
}

// ==========================================
// MÓDULO 8: CONSULTA DE USUÁRIOS (consultaUsuario.html)
// ==========================================
const tabelaUsuarios = document.getElementById('tabela-usuarios');

if (tabelaUsuarios) {
    const inputBuscaUsuario = document.getElementById('busca-nome-usuario');
    const selectCargoUsuario = document.getElementById('filtro-cargo-usuario');
    const selectPoloUsuario = document.getElementById('filtro-polo-usuario');
    const selectStatusUsuario = document.getElementById('filtro-status-usuario');

    let listaDeUsuarios = []; 

    // 1. Executa a requisição ao banco de dados na inicialização
    async function buscarUsuariosNoBanco() {
        tabelaUsuarios.innerHTML = '<tr><td colspan="6" class="text-center py-4">Estabelecendo conexão com o servidor...</td></tr>';
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
            console.error("Falha na recuperação de dados:", error);
            tabelaUsuarios.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Falha de comunicação com o banco de dados.</td></tr>';
        }
    }

    // 2. Método de construção da tabela HTML
    function desenharTabelaUsuarios(usuariosParaMostrar) {
        tabelaUsuarios.innerHTML = ''; 
        
        if(usuariosParaMostrar.length === 0) {
            tabelaUsuarios.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Nenhum registro correspondente aos critérios informados.</td></tr>';
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
                    <td>
                        <a href="editarUsuario.html?id=${usuario.idFirebase}" class="btn btn-sm btn-outline-secondary" title="Editar Registro"><i class="bi bi-pencil"></i></a>
                    </td>
                </tr>
            `;
            tabelaUsuarios.innerHTML += row;
        });
    }

    // 3. Processamento dos filtros locais
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

        if (selectPoloUsuario && selectPoloUsuario.value !== "todos") {
            filtrados = filtrados.filter(u => u.polo === selectPoloUsuario.value);
        }

        if (selectStatusUsuario && selectStatusUsuario.value !== "todos") {
            filtrados = filtrados.filter(u => u.status === selectStatusUsuario.value);
        }

        desenharTabelaUsuarios(filtrados);
    }

    // Vinculação de eventos aos campos de pesquisa
    if(inputBuscaUsuario) inputBuscaUsuario.addEventListener('input', aplicarFiltrosUsuarios);
    if(selectCargoUsuario) selectCargoUsuario.addEventListener('change', aplicarFiltrosUsuarios);
    if(selectPoloUsuario) selectPoloUsuario.addEventListener('change', aplicarFiltrosUsuarios);
    if(selectStatusUsuario) selectStatusUsuario.addEventListener('change', aplicarFiltrosUsuarios);

    // Inicializa a recuperação de dados
    buscarUsuariosNoBanco();
}

// ==========================================
// MÓDULO 9: PERFIL E EDIÇÃO DE USUÁRIOS (editarUsuario.html)
// ==========================================
const formEditarUsuario = document.getElementById('form-editar-usuario');

if (formEditarUsuario) {
    const urlParams = new URLSearchParams(window.location.search);
    const usuarioId = urlParams.get('id');

    if (!usuarioId) {
        alert("Erro de roteamento: Identificador do usuário não encontrado.");
        window.location.href = "consultaUsuario.html"; 
    } else {
        carregarDadosDoUsuario(usuarioId);
    }

    // Máscaras e Validações isoladas
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
                alert("Erro: O registro do funcionário não foi localizado na base de dados.");
                window.location.href = "consultaUsuario.html";
            }
        } catch (error) {
            console.error("Falha na recuperação de dados:", error);
            alert("Erro de comunicação com o servidor.");
        }
    }

    formEditarUsuario.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const cpfDigitado = document.getElementById('edit-cpf-usuario').value;
        if (!validarCPF(cpfDigitado)) {
            alert("Validação pendente: O CPF informado é inválido.");
            return;
        }

        const btnSalvar = document.getElementById('btn-salvar-edicao-usuario');
        btnSalvar.innerText = "ATUALIZANDO...";
        btnSalvar.disabled = true;

        try {
            const usuarioRef = doc(db, "funcionarios", usuarioId);
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

            alert("Operação concluída: Registro atualizado com sucesso.");
            window.location.href = "consultaUsuario.html"; 
        } catch (error) {
            console.error("Erro na atualização:", error);
            alert("Falha ao gravar alterações: " + error.message);
        } finally {
            btnSalvar.innerText = "SALVAR ALTERAÇÕES";
            btnSalvar.disabled = false;
        }
    });

    const btnExcluir = document.getElementById('btn-excluir-usuario');
    if (btnExcluir) {
        btnExcluir.addEventListener('click', async () => {
            const confirmacao = confirm("ATENÇÃO: Tem certeza que deseja excluir permanentemente este funcionário da base de dados?");
            if (confirmacao) {
                try {
                    await deleteDoc(doc(db, "funcionarios", usuarioId));
                    alert("Operação concluída: Registro excluído.");
                    window.location.href = "consultaUsuario.html"; 
                } catch (error) {
                    console.error("Erro na exclusão:", error);
                    alert("Falha na exclusão: " + error.message);
                }
            }
        });
    }
}

// ==========================================
// MÓDULO 10: CADASTRO DE POLOS (cadastroPolo.html)
// ==========================================
const formNovoPolo = document.getElementById('form-novo-polo');

if (formNovoPolo) {
    formNovoPolo.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita que a página recarregue

        const btnSalvar = document.getElementById('btn-salvar-polo');
        btnSalvar.innerText = "SALVANDO...";
        btnSalvar.disabled = true;

        try {
            // 1. Coleta e organiza os dados digitados (sem o CNPJ)
            const dadosPolo = {
                nome: document.getElementById('nome-polo').value,
                cep: document.getElementById('cep-polo').value,
                endereco: document.getElementById('endereco-polo').value,
                numero: document.getElementById('numero-polo').value,
                bairro: document.getElementById('bairro-polo').value,
                cidade: document.getElementById('cidade-polo').value,
                responsavel: document.getElementById('responsavel-polo').value,
                status: "ativo", // Já nasce ativo por padrão
                data_cadastro: new Date()
            };

            // 2. Salva no banco de dados na coleção "polos"
            await addDoc(collection(db, "polos"), dadosPolo);

            alert("Operação concluída: Novo polo registrado com sucesso na base de dados!");
            formNovoPolo.reset(); // Limpa o formulário para o próximo cadastro

        } catch (error) {
            console.error("Erro na gravação do polo:", error);
            alert("Falha na gravação: " + error.message);
        } finally {
            // Devolve o botão ao estado normal
            btnSalvar.innerText = "Salvar Polo";
            btnSalvar.disabled = false;
        }
    });
}

