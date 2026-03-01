// 1. Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
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
// MÓDULO 3: CONSULTAR ALUNOS (consultaAluno.html)
// ==========================================
const tabelaAlunos = document.getElementById('tabela-alunos');

if (tabelaAlunos) {
    // Função para ir no Firebase e fazer a tabela
    async function carregarAlunos() {
        // Mensagem de carregamento enquanto o Firebase carrega os dados
        tabelaAlunos.innerHTML = '<tr><td colspan="6" class="text-center py-4">Buscando alunos no banco de dados...</td></tr>';
        
        try {
            // Pede para o Firebase todos os documentos da coleção "alunos"
            const querySnapshot = await getDocs(collection(db, "alunos"));
            
            // Limpa a tabela
            tabelaAlunos.innerHTML = ''; 

            if(querySnapshot.empty) {
                tabelaAlunos.innerHTML = '<tr><td colspan="6" class="text-center py-4">Nenhum aluno cadastrado ainda.</td></tr>';
                return;
            }

            // Para cada aluno que ele achar, ele cria uma <tr> (linha) nova
            querySnapshot.forEach((doc) => {
                const aluno = doc.data();
                
                // Exibe os primeiros 5 caracteres do ID do Firebase como uma matrícula visual
                const matricula = doc.id.substring(0, 5).toUpperCase(); 

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
                // Injeta a linha pronta no HTML
                tabelaAlunos.innerHTML += row;
            });

        } catch (error) {
            console.error("Erro ao buscar alunos:", error);
            tabelaAlunos.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Erro ao carregar dados de alunos.</td></tr>';
        }
    }

    // Chama a função assim que a página abrir
    carregarAlunos();
}