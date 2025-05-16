package com.example.dbclient;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.beans.property.SimpleStringProperty;
import javafx.collections.ListChangeListener;
import javafx.concurrent.Task;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.image.ImageView;
import javafx.scene.input.ClipboardContent;
import javafx.scene.input.Dragboard;
import javafx.scene.input.TransferMode;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import javafx.scene.text.Font;
import javafx.scene.text.Text;
import javafx.stage.Modality;
import javafx.stage.Stage;
import javafx.stage.Window;
import com.example.dbclient.SavedQuery;
import com.example.dbclient.DbConnectionInfo;

import javafx.scene.image.Image;
import java.io.File;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import java.util.prefs.Preferences;

public class DbClientApp extends Application {

    private List<DbConnectionInfo> connections = new ArrayList<>();
    private ComboBox<DbConnectionInfo> connectionSelector;
    private List<SavedQuery> savedQueries = new ArrayList<>();
    private ComboBox<SavedQuery> querySelector;
    private Connection currentConnection;
    private VBox centerArea;
    private TextArea queryArea;
    private TableView<List<String>> resultTable;
    private TextArea logArea;
    private Scene scene;
    private ImageView loadingGifView;

    private String currentTheme = "light";
    private double currentFontSize = 12;

    private final ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private final File connectionsFile = Paths.get("connections.json").toFile();
    private final File queriesFile = Paths.get("queries.json").toFile();

    private final Preferences preferences = Preferences.userRoot().node(this.getClass().getName());

    @Override
    public void start(Stage primaryStage) {
        primaryStage.setTitle("DB AlertSnap v 0.1a");
        primaryStage.getIcons().add(new Image(getClass().getResourceAsStream("/icon.png")));

        BorderPane root = new BorderPane();

        // --- CONNECTION BLOCK ---
        connectionSelector = new ComboBox<>();
        connectionSelector.setPromptText("Выберите подключение");
        connectionSelector.setOnAction(e -> connectToDatabase());
        connectionSelector.setPrefWidth(400);  // фиксированная ширина

        Button addConnectionButton = new Button("Создать подключение");
        addConnectionButton.setOnAction(e -> openAddConnectionDialog(primaryStage));
        addConnectionButton.setPrefWidth(150);
        addConnectionButton.setMinWidth(150);
        addConnectionButton.setMaxWidth(150);

        Button testConnectionButton = new Button("Тест подключения");
        testConnectionButton.setOnAction(e -> testConnection());
        testConnectionButton.setPrefWidth(150);
        testConnectionButton.setMinWidth(150);
        testConnectionButton.setMaxWidth(150);

        Button deleteConnectionButton = new Button("Удалить подключение");
        deleteConnectionButton.setOnAction(e -> deleteSelectedConnection());
        deleteConnectionButton.setPrefWidth(150);
        deleteConnectionButton.setMinWidth(150);
        deleteConnectionButton.setMaxWidth(150);

        HBox connectionBox = new HBox(10, connectionSelector, addConnectionButton, testConnectionButton, deleteConnectionButton);
        connectionBox.setPadding(new Insets(10));

        // --- QUERY BLOCK ---
        querySelector = new ComboBox<>();
        querySelector.setPromptText("Выберите запрос");
        querySelector.setOnAction(e -> loadSelectedQuery());
        querySelector.setPrefWidth(400);       // другая ширина, если нужно

        Button saveQueryButton = new Button("Сохранить запрос");
        saveQueryButton.setOnAction(e -> saveCurrentQuery());
        saveQueryButton.setPrefWidth(150);
        saveQueryButton.setMinWidth(150);
        saveQueryButton.setMaxWidth(150);

        Button executeQueryButton = new Button("Выполнить запрос");
        executeQueryButton.setOnAction(e -> executeQueryAsync());
        executeQueryButton.setPrefWidth(150);
        executeQueryButton.setMinWidth(150);
        executeQueryButton.setMaxWidth(150);

        Button deleteQueryButton = new Button("Удалить запрос");
        deleteQueryButton.setOnAction(e -> deleteSelectedQuery());
        deleteQueryButton.setPrefWidth(150);
        deleteQueryButton.setMinWidth(150);
        deleteQueryButton.setMaxWidth(150);

        HBox queryBox = new HBox(10, querySelector, saveQueryButton, executeQueryButton, deleteQueryButton);
        queryBox.setPadding(new Insets(10));

        // --- SETTINGS BUTTON ---
        Image settingsIcon = new Image(getClass().getResourceAsStream("/settings_icon.png"));
        ImageView settingsIconView = new ImageView(settingsIcon);
        Button settingsButton = new Button("", settingsIconView);
        settingsButton.setStyle("-fx-background-color: transparent;");
        settingsButton.setOnAction(e -> openSettingsDialog(primaryStage));

        // --- TOP BAR: vertically stacked connection + query + settings ---
        VBox leftTopArea = new VBox(10, connectionBox, queryBox);
        BorderPane topBar = new BorderPane();
        topBar.setLeft(leftTopArea);
        topBar.setRight(settingsButton);
        BorderPane.setMargin(settingsButton, new Insets(10));

        // --- CENTER ---
        queryArea = new TextArea();
        queryArea.setPrefHeight(150);
        queryArea.setWrapText(true);

        resultTable = new TableView<>();
        resultTable.setPrefHeight(400);

        // === Инициализация loadingGifView ДО использования ===
        loadingGifView = new ImageView(new Image(getClass().getResourceAsStream("/loading.gif")));
        loadingGifView.setPreserveRatio(true);
        loadingGifView.setFitHeight(64); // или другое подходящее значение
        loadingGifView.setVisible(false);
        loadingGifView.setManaged(false);

        // === StackPane для наложения анимации поверх таблицы ===
        StackPane resultStack = new StackPane(resultTable, loadingGifView);
        StackPane.setAlignment(loadingGifView, Pos.CENTER);
        resultStack.setPrefHeight(400);

        // === Основной центральный блок ===
        centerArea = new VBox(10, queryArea, resultStack);
        centerArea.setPadding(new Insets(10));

        // --- LOG AREA ---
        logArea = new TextArea();
        logArea.setEditable(false);
        logArea.setPrefHeight(150);

        root.setTop(topBar);
        root.setCenter(centerArea);
        root.setBottom(logArea);

        scene = new Scene(root, 1200, 850);
        primaryStage.setScene(scene);
        primaryStage.show();

        loadConnections();
        loadQueries();
        loadSettings();
    }


    private void openSettingsDialog(Window owner) {
        Stage dialog = new Stage();
        dialog.initModality(Modality.APPLICATION_MODAL);
        dialog.initOwner(owner);
        dialog.setTitle("Настройки");
        dialog.getIcons().add(new Image(getClass().getResourceAsStream("/icon.png")));

        Slider fontSizeSlider = new Slider(10, 30, currentFontSize);
        fontSizeSlider.setShowTickLabels(true);
        fontSizeSlider.setShowTickMarks(true);

        ToggleGroup themeGroup = new ToggleGroup();
        RadioButton lightTheme = new RadioButton("Светлая тема");
        RadioButton darkTheme = new RadioButton("Тёмная тема");
        lightTheme.setToggleGroup(themeGroup);
        darkTheme.setToggleGroup(themeGroup);

        if ("dark".equals(currentTheme)) {
            darkTheme.setSelected(true);
        } else {
            lightTheme.setSelected(true);
        }

        Button applyButton = new Button("Применить");
        applyButton.setOnAction(e -> {
            currentFontSize = fontSizeSlider.getValue();
            currentTheme = darkTheme.isSelected() ? "dark" : "light";

            preferences.putDouble("fontSize", currentFontSize);
            preferences.put("theme", currentTheme);

            applySettings(scene);
            applySettings(dialog.getScene());

            dialog.close();
        });

        VBox vbox = new VBox(10, new Label("Размер шрифта:"), fontSizeSlider, lightTheme, darkTheme, applyButton);
        vbox.setPadding(new Insets(10));

        Scene dialogScene = new Scene(vbox);
        applySettings(dialogScene);
        dialog.setScene(dialogScene);
        dialog.showAndWait();
    }

    private void loadSettings() {
        currentFontSize = preferences.getDouble("fontSize", 12);
        currentTheme = preferences.get("theme", "light");

        applySettings(scene);
    }

    private void applySettings(Scene sceneToStyle) {
        if (sceneToStyle != null) {
            sceneToStyle.getRoot().setStyle("-fx-font-size: " + currentFontSize + "px;");

            if ("dark".equals(currentTheme)) {
                sceneToStyle.getRoot().setStyle("-fx-base: #2b2b2b; -fx-background: #2b2b2b; -fx-text-fill: #ffffff;");
            } else {
                sceneToStyle.getRoot().setStyle("");
            }
        }
    }

    private void deleteSelectedConnection() {
        DbConnectionInfo selected = connectionSelector.getValue();
        if (selected != null) {
            connections.remove(selected);
            connectionSelector.getItems().remove(selected);
            saveConnections();
            log("Удалено подключение: " + selected.getName());
        }
    }

    private void deleteSelectedQuery() {
        SavedQuery selected = querySelector.getValue();
        if (selected != null) {
            savedQueries.remove(selected);
            querySelector.getItems().remove(selected);
            saveQueries();
            log("Удалён запрос: " + selected.getName());
        }
    }

    private void openAddConnectionDialog(Window owner) {
        Stage dialog = new Stage();
        dialog.initModality(Modality.APPLICATION_MODAL);
        dialog.initOwner(owner);
        dialog.setTitle("Создать подключение");
        dialog.getIcons().add(new Image(getClass().getResourceAsStream("/icon.png")));

        TextField nameField = new TextField();
        ComboBox<String> typeField = new ComboBox<>();
        typeField.getItems().addAll("Oracle", "PostgreSQL");
        TextField urlField = new TextField();
        TextField usernameField = new TextField();
        PasswordField passwordField = new PasswordField();

        Button saveButton = new Button("Сохранить");
        saveButton.setOnAction(e -> {
            DbConnectionInfo info = new DbConnectionInfo(
                    nameField.getText(),
                    typeField.getValue(),
                    urlField.getText(),
                    usernameField.getText(),
                    passwordField.getText()
            );
            connections.add(info);
            connectionSelector.getItems().add(info);
            saveConnections();
            dialog.close();
        });

        VBox vbox = new VBox(10,
                new Label("Название:"), nameField,
                new Label("Тип подключения:"), typeField,
                new Label("JDBC URL:"), urlField,
                new Label("Логин:"), usernameField,
                new Label("Пароль:"), passwordField,
                saveButton
        );
        vbox.setPadding(new Insets(10));

        Scene dialogScene = new Scene(vbox);
        applySettings(dialogScene);
        dialog.setScene(dialogScene);
        dialog.showAndWait();
    }

    private void connectToDatabase() {
        DbConnectionInfo selected = connectionSelector.getValue();
        if (selected == null) {
            log("Подключение не выбрано");
            return;
        }

        try {
            if (currentConnection != null && !currentConnection.isClosed()) {
                currentConnection.close();
            }
            currentConnection = DriverManager.getConnection(
                    selected.getUrl(), selected.getUsername(), selected.getPassword()
            );
            log("Подключено к " + selected.getName());
        } catch (SQLException e) {
            log("Ошибка подключения: " + e.getMessage());
        }
    }

    private void testConnection() {
        DbConnectionInfo selected = connectionSelector.getValue();
        if (selected == null) {
            log("Подключение не выбрано для тестирования");
            return;
        }

        try (Connection conn = DriverManager.getConnection(selected.getUrl(), selected.getUsername(), selected.getPassword())) {
            log("Тест подключения успешен к " + selected.getName());
        } catch (SQLException e) {
            log("Ошибка теста подключения: " + e.getMessage());
        }
    }

    private void saveCurrentQuery() {
        if (queryArea.getText() == null || queryArea.getText().isEmpty()) {
            log("Пустой запрос не может быть сохранён");
            return;
        }

        Stage dialog = new Stage();
        dialog.initModality(Modality.APPLICATION_MODAL);
        dialog.initOwner(scene.getWindow());
        dialog.setTitle("Сохранение запроса");
        dialog.getIcons().add(new Image(getClass().getResourceAsStream("/icon.png")));

        Label label = new Label("Введите название для запроса:");
        TextField nameField = new TextField();
        Button okButton = new Button("OK");

        okButton.setOnAction(e -> {
            if (!nameField.getText().isEmpty()) {
                SavedQuery newQuery = new SavedQuery(nameField.getText(), queryArea.getText());
                savedQueries.add(newQuery);
                querySelector.getItems().add(newQuery);
                saveQueries();
                dialog.close();
            }
        });

        VBox vbox = new VBox(10, label, nameField, okButton);
        vbox.setPadding(new Insets(10));

        Scene dialogScene = new Scene(vbox);
        applySettings(dialogScene);
        dialog.setScene(dialogScene);
        dialog.showAndWait();
    }

    private void loadSelectedQuery() {
        SavedQuery selected = querySelector.getValue();
        if (selected != null) {
            queryArea.setText(selected.getSql());
        }
    }

    private void executeQueryAsync() {
        if (currentConnection == null) {
            log("Нет активного подключения к БД");
            return;
        }
        if (queryArea == null || queryArea.getText().isEmpty()) {
            log("Запрос пустой или не создан");
            return;
        }

        String sql = queryArea.getText();

        Task<Void> task = new Task<>() {
            private List<String> columnNames;
            private List<List<String>> rows;

            @Override
            protected Void call() throws Exception {
                try (Statement stmt = currentConnection.createStatement()) {
                    boolean result = stmt.execute(sql);

                    if (result) {
                        try (ResultSet rs = stmt.getResultSet()) {
                            ResultSetMetaData metaData = rs.getMetaData();
                            int columnCount = metaData.getColumnCount();

                            columnNames = new ArrayList<>();
                            for (int i = 1; i <= columnCount; i++) {
                                columnNames.add(metaData.getColumnName(i));
                            }

                            rows = new ArrayList<>();
                            while (rs.next()) {
                                List<String> row = new ArrayList<>();
                                for (int i = 1; i <= columnCount; i++) {
                                    row.add(rs.getString(i));
                                }
                                rows.add(row);
                            }
                        }
                    } else {
                        int updateCount = stmt.getUpdateCount();
                        Platform.runLater(() -> {
                            resultTable.getItems().clear();
                            resultTable.getColumns().clear();
                            log("Запрос выполнен успешно (обновлено строк: " + updateCount + ")");
                        });
                    }
                }
                return null;
            }

            @Override
            protected void succeeded() {
                if (rows != null && columnNames != null) {
                    Platform.runLater(() -> {
                        displayResultSetFromData(columnNames, rows);
                        loadingGifView.setVisible(false);
                        loadingGifView.setManaged(false);
                        resultTable.setVisible(true);
                        resultTable.setManaged(true);
                        log("Запрос выполнен успешно (ResultSet)");
                    });
                }
                notifyUser("✅ Запрос выполнен");
            }

            @Override
            protected void failed() {
                Throwable ex = getException();
                log("Ошибка выполнения запроса: " + (ex != null ? ex.getMessage() : "неизвестная ошибка"));
                notifyUser("❌ Ошибка выполнения запроса");

                Platform.runLater(() -> {
                    loadingGifView.setVisible(false);
                    loadingGifView.setManaged(false);
                    resultTable.setVisible(true);
                    resultTable.setManaged(true);
                });
            }
        };

        Platform.runLater(() -> {
            loadingGifView.setVisible(true);
            loadingGifView.setManaged(true);
            resultTable.setVisible(false);
            resultTable.setManaged(false);
        });

        new Thread(task).start();
    }

    private void displayResultSetFromData(List<String> columnNames, List<List<String>> data) {
        resultTable.getItems().clear();
        resultTable.getColumns().clear();

        // Колонка с номерами строк (нумерация)
        TableColumn<List<String>, String> indexColumn = new TableColumn<>("#");
        indexColumn.setCellValueFactory(param -> {
            int rowIndex = resultTable.getItems().indexOf(param.getValue()) + 1;
            return new SimpleStringProperty(String.format("%03d", rowIndex));
        });
        indexColumn.setPrefWidth(50);
        indexColumn.setResizable(false);
        indexColumn.setSortable(false);
        indexColumn.setStyle("-fx-alignment: CENTER;");
        resultTable.getColumns().add(indexColumn);

        // Основные колонки с данными
        for (int i = 0; i < columnNames.size(); i++) {
            final int colIndex = i;
            TableColumn<List<String>, String> column = new TableColumn<>(columnNames.get(i));
            column.setCellValueFactory(cellData -> {
                List<String> row = cellData.getValue();
                return new SimpleStringProperty(row.get(colIndex));
            });
            column.setPrefWidth(150); // фиксированная ширина колонок
            column.setResizable(false);
            column.setStyle("-fx-alignment: CENTER-LEFT;");
            resultTable.getColumns().add(column);
        }

        // Устанавливаем фиксированную высоту строк
        resultTable.setFixedCellSize(30);
        resultTable.setStyle("-fx-fixed-cell-size: 30px;");

        resultTable.getItems().addAll(data);
    }

    private void notifyUser(String message) {
        Platform.runLater(() -> {
            Stage stage = (Stage) scene.getWindow();
            if (stage.isIconified()) {
                stage.setIconified(false);
                stage.toFront();
            }

            Alert alert = new Alert(Alert.AlertType.INFORMATION);
            alert.setTitle("Уведомление");
            alert.setHeaderText(null);
            alert.setContentText(message);
            alert.initOwner(stage);

            DialogPane dialogPane = alert.getDialogPane();
            dialogPane.setStyle("-fx-font-size: " + currentFontSize + "px;");

            if ("dark".equals(currentTheme)) {
                dialogPane.setStyle(dialogPane.getStyle() + " -fx-background-color: #2b2b2b;");
            } else {
                dialogPane.setStyle(dialogPane.getStyle() + " -fx-background-color: white;");
            }

            alert.show();

            // ✅ Применить цвет текста и кнопки ПОСЛЕ отображения
            Platform.runLater(() -> {
                Node content = dialogPane.lookup(".content.label");
                Node button = dialogPane.lookupButton(ButtonType.OK);

                if ("dark".equals(currentTheme)) {
                    if (content != null) content.setStyle("-fx-text-fill: white;");
                    if (button != null) button.setStyle("-fx-text-fill: white;");
                } else {
                    if (content != null) content.setStyle("-fx-text-fill: black;");
                    if (button != null) button.setStyle("-fx-text-fill: black;");
                }
            });
        });
    }




    private void displayResultSet(ResultSet rs) throws SQLException {
        resultTable.getItems().clear();
        resultTable.getColumns().clear();

        // 1. Колонка с номерами строк
        TableColumn<List<String>, String> indexColumn = new TableColumn<>("#");
        indexColumn.setCellValueFactory(param -> {
            int rowIndex = resultTable.getItems().indexOf(param.getValue()) + 1;
            return new SimpleStringProperty(String.valueOf(rowIndex));
        });
        indexColumn.setCellFactory(col -> new TableCell<>() {
            @Override
            protected void updateItem(String item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) {
                    setText(null);
                } else {
                    setText(item);
                    setStyle("-fx-alignment: CENTER; -fx-font-weight: bold;");
                }
            }
        });
        indexColumn.setPrefWidth(50);
        indexColumn.setResizable(false);
        indexColumn.setSortable(false);
        resultTable.getColumns().add(indexColumn);

        // 2. Основные колонки с данными
        ResultSetMetaData metaData = rs.getMetaData();
        int columnCount = metaData.getColumnCount();

        for (int i = 1; i <= columnCount; i++) {
            final int colIndex = i;
            TableColumn<List<String>, String> column = new TableColumn<>(metaData.getColumnName(i));

            column.setCellValueFactory(param -> {
                List<String> row = param.getValue();
                String value = row.get(colIndex - 1);
                return new SimpleStringProperty(value != null ? value : "NULL");
            });

            column.setCellFactory(tc -> new TableCell<>() {
                private Text text;

                @Override
                protected void updateItem(String item, boolean empty) {
                    super.updateItem(item, empty);
                    if (empty || item == null) {
                        setGraphic(null);
                        setText(null);
                    } else {
                        if (text == null) {
                            text = new Text(item);
                            text.wrappingWidthProperty().bind(column.widthProperty().subtract(10));
                            text.setStyle("-fx-font-size: " + currentFontSize + "px;");
                        } else {
                            text.setText(item);
                        }
                        setGraphic(text);
                    }
                }
            });

            String columnType = metaData.getColumnTypeName(i).toLowerCase();
            if (columnType.matches(".*(int|num|dec|float|double).*")) {
                column.setStyle("-fx-alignment: CENTER-RIGHT;");
            }

            column.setPrefWidth(150);
            resultTable.getColumns().add(column);
        }

        // 3. Заполнение данными
        while (rs.next()) {
            List<String> row = new ArrayList<>();
            for (int i = 1; i <= columnCount; i++) {
                row.add(rs.getString(i));
            }
            resultTable.getItems().add(row);
        }

        // 4. Настройка фиксированной высоты строк
        resultTable.setFixedCellSize(30);
        resultTable.setStyle("-fx-fixed-cell-size: 30px;");
    }

    private void saveConnections() {
        List<DbConnectionInfo> connectionsToSave = new ArrayList<>();
        for (DbConnectionInfo conn : connections) {
            DbConnectionInfo encryptedConn = new DbConnectionInfo(
                    conn.getName(),
                    conn.getType(),
                    conn.getUrl(),
                    conn.getUsername(),
                    "ENC:" + Base64.getEncoder().encodeToString(
                            conn.getPassword().getBytes(StandardCharsets.UTF_8)
                    )
            );
            connectionsToSave.add(encryptedConn);
        }

        try {
            mapper.writeValue(connectionsFile, connectionsToSave);
        } catch (IOException e) {
            log("Ошибка сохранения подключений: " + e.getMessage());
        }
    }

    private void saveQueries() {
        try {
            mapper.writeValue(queriesFile, savedQueries);
        } catch (IOException e) {
            log("Ошибка сохранения запросов: " + e.getMessage());
        }
    }

    private void loadConnections() {
        File fileToLoad = this.connectionsFile;
        ObjectMapper jsonMapper = this.mapper;

        new Thread(() -> {
            try {
                if (!fileToLoad.exists()) {
                    Platform.runLater(() -> connections = new ArrayList<>());
                    return;
                }

                List<DbConnectionInfo> loadedConnections = jsonMapper.readValue(
                        fileToLoad,
                        new TypeReference<List<DbConnectionInfo>>() {}
                );

                decryptPasswords(loadedConnections);

                Platform.runLater(() -> {
                    this.connections = loadedConnections != null ? loadedConnections : new ArrayList<>();
                    connectionSelector.getItems().setAll(this.connections);
                });

            } catch (IOException e) {
                Platform.runLater(() -> {
                    log("Ошибка загрузки подключений: " + e.getMessage());
                    connections = new ArrayList<>();
                });
            }
        }).start();
    }

    private void decryptPasswords(List<DbConnectionInfo> connections) {
        if (connections == null) return;

        for (DbConnectionInfo conn : connections) {
            DbConnectionInfo finalConn = conn;
            try {
                if (finalConn.getPassword() != null && finalConn.getPassword().startsWith("ENC:")) {
                    String encrypted = finalConn.getPassword().substring(4);
                    String decrypted = new String(
                            Base64.getDecoder().decode(encrypted),
                            StandardCharsets.UTF_8
                    );
                    finalConn.setPassword(decrypted);
                }
            } catch (Exception e) {
                log("Ошибка дешифровки пароля для подключения " + finalConn.getName());
                finalConn.setPassword("");
            }
        }
    }

    private void loadQueries() {
        if (queriesFile.exists()) {
            try {
                savedQueries = mapper.readValue(queriesFile, new TypeReference<List<SavedQuery>>() {});
                querySelector.getItems().clear();
                querySelector.getItems().addAll(savedQueries);
                log("Загружено запросов: " + savedQueries.size());
            } catch (IOException e) {
                log("Ошибка загрузки запросов: " + e.getMessage());
            }
        } else {
            log("Файл queries.json не найден");
        }
    }

    private void log(String message) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        String fullMessage = timestamp + " - " + message;
        logArea.appendText(fullMessage + "\n");
        try (FileWriter fw = new FileWriter("dbclient.log", true)) {
            fw.write(fullMessage + "\n");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static void main(String[] args) {
        launch(args);
    }

    @Override
    public void stop() {
        saveConnections();
        saveQueries();
    }
}