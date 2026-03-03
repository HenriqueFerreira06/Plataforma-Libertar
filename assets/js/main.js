// 1. Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, getDocs} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 2. As suas chaves exclusivas do projeto Libertar
const firebaseConfig = {
  apiKey: "AIzaSyBlZj_j8WZC4fALp9aPhzNyaXZaqrsoVqs",
  authDomain: "libertarbd.firebaseapp.com",
  projectId: "libertarbd",
  storageBucket: "libertarbd.firebasestorage.app",
  messagingSenderId: "989803267776",
  appId: "1:989803267776:web:4227525600b40d38d70f25"
};

// 3. Inicializa o Firebase Principal (Usado para o Login)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 4. Inicializa o "Firebase Secundário" (Para cadastrar sem deslogar o usuario)
const appCadastro = initializeApp(firebaseConfig, "AppParaCadastros");
const authCadastro = getAuth(appCadastro);

// ==========================================
// MÓDULO 1: TELA DE LOGIN (index.html)
// ==========================================
const formLogin = document.getElementById('form-login');

if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault(); 

        const email = document.getElementById('email-login').value;
        const senha = document.getElementById('senha-login').value;

        // Tenta fazer o login no Firebase principal
        signInWithEmailAndPassword(auth, email, senha)
            .then((userCredential) => {
                // Manda pro dashboard
                window.location.href = "dashboard.html"; 
            })
            .catch((error) => {
                if(error.code === 'auth/invalid-credential') {
                    alert("E-mail ou senha incorretos!");
                } else {
                    alert("Erro ao fazer login: " + error.message);
                }
            });
    });


const btnEnviarRecuperacao = document.getElementById('btn-enviar-recuperacao');

if (btnEnviarRecuperacao) {
    btnEnviarRecuperacao.addEventListener('click', () => {
        // Pega o e-mail que o usuário digitou dentro do Modal
        const emailParaReset = document.getElementById('email-recuperacao').value;

        if (!emailParaReset) {
            alert("Por favor, digite um e-mail válido.");
            return;
        }

        
        btnEnviarRecuperacao.innerText = "Enviando...";
        btnEnviarRecuperacao.disabled = true;

        sendPasswordResetEmail(auth, emailParaReset)
            .then(() => {
                alert("E-mail de redefinição enviado! Verifique sua caixa de entrada (e o Spam).");
                
                
                const modalElement = document.getElementById('modalEsqueciSenha');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                modalInstance.hide();
                
                
                document.getElementById('email-recuperacao').value = '';
            })
            .catch((error) => {
                if (error.code === 'auth/invalid-email') {
                    alert("Erro: O formato do e-mail é inválido.");
                } else if (error.code === 'auth/user-not-found' || error.code === 'auth/missing-email') {
                    alert("Erro: Este e-mail não está cadastrado no sistema.");
                } else {
                    alert("Erro ao enviar o e-mail: " + error.message);
                }
            })
            .finally(() => {
                // Volta o botão ao estado normal
                btnEnviarRecuperacao.innerText = "Enviar Link";
                btnEnviarRecuperacao.disabled = false;
            });
    });
}
}

// ==========================================
// MÓDULO 2: CADASTRAR NOVO ALUNO (novoAluno.html)
// ==========================================
const formNovoAluno = document.getElementById('form-novo-aluno');

if (formNovoAluno) {
    formNovoAluno.addEventListener('submit', (e) => {
        e.preventDefault();

        // Pega todos os valores digitados na tela
        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const cpf = document.getElementById('cpf').value;
        const polo = document.getElementById('polo').value;
        const turma = document.getElementById('turma').value;
        
        // Usa o CPF limpo (sem pontos ou traço) como primeira senha do aluno
        const senhaInicial = cpf.replace(/\D/g, ""); 

        if(senhaInicial.length < 6) {
            alert("Erro: O CPF precisa estar completo para gerar a senha.");
            return;
        }

        // Cria a conta do aluno no "Firebase Secundário"
        createUserWithEmailAndPassword(authCadastro, email, senhaInicial)
            .then((userCredential) => {
                const userAluno = userCredential.user;
                
                // Salva os dados extras do aluno no Firestore
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
                alert("Aluno cadastrado com sucesso! A senha inicial é o CPF (apenas números).");
                formNovoAluno.reset(); // Limpa a tela para o próximo cadastro
            })
            .catch((error) => {
                if(error.code === 'auth/email-already-in-use') {
                    alert("Esse e-mail já está cadastrado no sistema!");
                } else {
                    alert("Erro ao cadastrar: " + error.message);
                }
            });
    });
}

// ==========================================
// MÓDULO 3: CONSULTAR ALUNOS 
// ==========================================
const tabelaAlunos = document.getElementById('tabela-alunos');

// Pega os campos de filtro do HTML
const inputBusca = document.getElementById('busca-nome');
const selectPolo = document.getElementById('filtro-polo');
const selectTurma = document.getElementById('filtro-turma');
const selectStatus = document.getElementById('filtro-status'); 

// Memória temporária para não gastar o banco de dados
let listaDeAlunos = []; 

if (tabelaAlunos) {
    // 1. Busca no banco UMA ÚNICA VEZ
    async function buscarAlunosNoBanco() {
        tabelaAlunos.innerHTML = '<tr><td colspan="6" class="text-center py-4">Buscando alunos no servidor...</td></tr>';
        try {
            const querySnapshot = await getDocs(collection(db, "alunos"));
            listaDeAlunos = []; // Zera a lista
            
            querySnapshot.forEach((doc) => {
                const aluno = doc.data();
                aluno.idFirebase = doc.id; // Guarda a chave do aluno
                listaDeAlunos.push(aluno); // Salva na memória do navegador
            });

            // Mostra todo mundo na primeira vez
            desenharTabela(listaDeAlunos);

        } catch (error) {
            console.error("Erro ao buscar alunos:", error);
            tabelaAlunos.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Erro de conexão com o banco de dados.</td></tr>';
        }
    }

    // 2. Função que constrói as linhas
    function desenharTabela(alunosParaMostrar) {
        tabelaAlunos.innerHTML = ''; 
        
        if(alunosParaMostrar.length === 0) {
            tabelaAlunos.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Nenhum aluno encontrado com esses filtros.</td></tr>';
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
                        <button class="btn btn-sm btn-outline-secondary" title="Editar"><i class="bi bi-pencil"></i></button>
                    </td>
                </tr>
            `;
            tabelaAlunos.innerHTML += row;
        });
    }

    // 3. Filtros
    function aplicarFiltros() {
        let alunosFiltrados = listaDeAlunos;

        // Filtra por Nome ou CPF digitado
        if (inputBusca && inputBusca.value.trim() !== '') {
            const termo = inputBusca.value.toLowerCase();
            alunosFiltrados = alunosFiltrados.filter(aluno => 
                aluno.nome_completo.toLowerCase().includes(termo) || 
                (aluno.cpf && aluno.cpf.includes(termo))
            );
        }

        // Filtra pelo Polo escolhido (Ignora se for "todos")
        if (selectPolo && selectPolo.value !== "todos") {
            alunosFiltrados = alunosFiltrados.filter(aluno => aluno.polo === selectPolo.value);
        }

        // Filtra pela Turma escolhida (Ignora se for "todos")
        if (selectTurma && selectTurma.value !== "todos") {
            alunosFiltrados = alunosFiltrados.filter(aluno => aluno.turma === selectTurma.value);
        }

        // Filtra pelo Status escolhido (Ignora se for "todos")
        if (selectStatus && selectStatus.value !== "todos") {
            alunosFiltrados = alunosFiltrados.filter(aluno => aluno.status === selectStatus.value);
        }

        // Desenha a tabela de novo só com os sobreviventes do filtro
        desenharTabela(alunosFiltrados);
    }

    
    if(inputBusca) inputBusca.addEventListener('input', aplicarFiltros);
    if(selectPolo) selectPolo.addEventListener('change', aplicarFiltros);
    if(selectTurma) selectTurma.addEventListener('change', aplicarFiltros);
    if(selectStatus) selectStatus.addEventListener('change', aplicarFiltros);

   
    buscarAlunosNoBanco();
}