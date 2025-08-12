const SUPABASE_URL = "https://erebpbsbafoluuhtymqh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyZWJwYnNiYWZvbHV1aHR5bXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDUxNTcsImV4cCI6MjA3MDA4MTE1N30.dmD72RUU4gFs3QsyuHnyLS2cJc-Pm4cVqYpKksyobZE";

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ------------------------- TOAST BONITOS ------------------------- */
function mostrarToast(mensaje, tipo = "success") {
  const toast = document.createElement("div");
  toast.className = "toast" + (tipo === "error" ? " error" : "");
  toast.textContent = mensaje;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

/* ------------------------- AGREGAR ------------------------- */
async function agregarEstudiante() {
  const nombre = document.getElementById("nombre").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const clase = document.getElementById("clase").value.trim();

  const { data: { user }, error: userError } = await client.auth.getUser();

  if (userError || !user) {
    mostrarToast("No estás autenticado.", "error");
    return;
  }

  const { error } = await client.from("estudiantes").insert({
    nombre,
    correo,
    clase,
    user_id: user.id,
  });

  if (error) {
    mostrarToast("Error al agregar: " + error.message, "error");
  } else {
    mostrarToast("Estudiante agregado correctamente");
    cargarEstudiantes();
  }
}

/* ------------------------- CARGAR ------------------------- */
async function cargarEstudiantes() {
  const { data, error } = await client
    .from("estudiantes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    mostrarToast("Error al cargar estudiantes: " + error.message, "error");
    return;
  }

  const lista = document.getElementById("lista-estudiantes");
  lista.innerHTML = "";

  data.forEach((est) => {
    const item = document.createElement("li");
    item.innerHTML = `
      ${est.nombre} (${est.clase})
      <div>
        <button class="btn-editar" onclick="editarEstudiante(${est.id}, '${est.nombre}', '${est.correo}', '${est.clase}')">✏️</button>
        <button class="btn-eliminar" onclick="eliminarEstudiante(${est.id})">🗑️</button>
      </div>
    `;
    lista.appendChild(item);
  });
}
cargarEstudiantes();

/* ------------------------- ELIMINAR ------------------------- */
async function eliminarEstudiante(id) {
  if (!confirm("¿Seguro que deseas eliminar este estudiante?")) return;

  const { error } = await client.from("estudiantes").delete().eq("id", id);

  if (error) {
    mostrarToast("Error al eliminar: " + error.message, "error");
  } else {
    mostrarToast("Estudiante eliminado correctamente");
    cargarEstudiantes();
  }
}

/* ------------------------- EDITAR ------------------------- */
function editarEstudiante(id, nombre, correo, clase) {
  const nuevoNombre = prompt("Nuevo nombre:", nombre);
  const nuevoCorreo = prompt("Nuevo correo:", correo);
  const nuevaClase = prompt("Nueva clase:", clase);

  if (nuevoNombre && nuevoCorreo && nuevaClase) {
    actualizarEstudiante(id, nuevoNombre, nuevoCorreo, nuevaClase);
  }
}

async function actualizarEstudiante(id, nombre, correo, clase) {
  const { error } = await client
    .from("estudiantes")
    .update({ nombre, correo, clase })
    .eq("id", id);

  if (error) {
    mostrarToast("Error al actualizar: " + error.message, "error");
  } else {
    mostrarToast("Estudiante actualizado correctamente");
    cargarEstudiantes();
  }
}

/* ------------------------- SUBIR ARCHIVO ------------------------- */
async function subirArchivo() {
  const archivoInput = document.getElementById("archivo");
  const archivo = archivoInput.files[0];

  if (!archivo) {
    mostrarToast("Selecciona un archivo primero.", "error");
    return;
  }

  const { data: { user }, error: userError } = await client.auth.getUser();

  if (userError || !user) {
    mostrarToast("Sesión no válida.", "error");
    return;
  }

  const nombreRuta = `${user.id}/${archivo.name}`;
  const { error } = await client.storage
    .from("tareas")
    .upload(nombreRuta, archivo, { cacheControl: "3600", upsert: false });

  if (error) {
    mostrarToast("Error al subir: " + error.message, "error");
  } else {
    mostrarToast("Archivo subido correctamente");
    listarArchivos();
  }
}

/* ------------------------- LISTAR ARCHIVOS ------------------------- */
async function listarArchivos() {
  const { data: { user }, error: userError } = await client.auth.getUser();

  if (userError || !user) {
    mostrarToast("Sesión no válida.", "error");
    return;
  }

  const { data, error } = await client.storage
    .from("tareas")
    .list(`${user.id}`, { limit: 20 });

  const lista = document.getElementById("lista-archivos");
  lista.innerHTML = "";

  if (error) {
    lista.innerHTML = "<li>Error al listar archivos</li>";
    return;
  }

  data.forEach(async (archivo) => {
    const { data: signedUrlData } = await client.storage
      .from("tareas")
      .createSignedUrl(`${user.id}/${archivo.name}`, 60);

    const publicUrl = signedUrlData.signedUrl;
    const item = document.createElement("li");

    if (/\.(jpg|jpeg|png|gif)$/i.test(archivo.name)) {
      item.innerHTML = `<strong>${archivo.name}</strong><br>
        <a href="${publicUrl}" target="_blank">
          <img src="${publicUrl}" width="150"/>
        </a>`;
    } else if (/\.pdf$/i.test(archivo.name)) {
      item.innerHTML = `<strong>${archivo.name}</strong><br>
        <a href="${publicUrl}" target="_blank">Ver PDF</a>`;
    } else {
      item.innerHTML = `<a href="${publicUrl}" target="_blank">${archivo.name}</a>`;
    }

    lista.appendChild(item);
  });
}
listarArchivos();

/* ------------------------- CERRAR SESIÓN ------------------------- */
async function cerrarSesion() {
  const { error } = await client.auth.signOut();

  if (error) {
    mostrarToast("Error al cerrar sesión: " + error.message, "error");
  } else {
    localStorage.removeItem("token");
    mostrarToast("Sesión cerrada correctamente");
    window.location.href = "index.html";
  }
}
